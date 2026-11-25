-- Lists the privileges the API roles have on app objects, as GRANT statements.
-- Run on local and on a hosted project and diff (docs/DATABASE.md, "Privileges"):
--   docker exec -i supabase_db_moment psql -U postgres -At < supabase/scripts/api_grants.sql | sort > /tmp/local.sql
--   npx supabase db query --linked -f supabase/scripts/api_grants.sql -o json
set search_path = '';
with roles(r) as (values ('anon'), ('authenticated'), ('service_role')),
schemas(n) as (values ('public'), ('private')),
rels as (
  select c.oid, n.nspname, c.relname, c.relkind, c.relacl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select n from schemas) and c.relkind in ('r','v','m','p','S')
),
rel_privs as (
  select r.nspname, r.relname, r.relkind, a.privilege_type, g.rolname
  from rels r, aclexplode(r.relacl) a join pg_roles g on g.oid = a.grantee
  where g.rolname in (select r from roles)
    and a.privilege_type in ('SELECT','INSERT','UPDATE','DELETE','USAGE')
),
col_privs as (
  select n.nspname, c.relname, att.attname, a.privilege_type, g.rolname
  from pg_attribute att
  join pg_class c on c.oid = att.attrelid join pg_namespace n on n.oid = c.relnamespace,
  aclexplode(att.attacl) a join pg_roles g on g.oid = a.grantee
  where n.nspname in (select n from schemas) and att.attacl is not null and att.attnum > 0
    and g.rolname in (select r from roles)
),
fn_privs as (
  select p.oid, n.nspname, coalesce(g.rolname, 'public') as rolname
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  left join pg_roles g on g.oid = a.grantee
  where n.nspname in (select n from schemas) and a.privilege_type = 'EXECUTE'
    and (a.grantee = 0 or g.rolname in (select r from roles))
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
sch_privs as (
  select n.nspname, g.rolname
  from pg_namespace n, aclexplode(n.nspacl) a join pg_roles g on g.oid = a.grantee
  where n.nspname in (select n from schemas) and a.privilege_type = 'USAGE' and g.rolname in (select r from roles)
)
select stmt from (
  select 1 o, format('grant usage on schema %I to %I;', nspname, rolname) stmt from sch_privs
  union all
  select 2, format('grant %s on %s %I.%I to %I;', string_agg(privilege_type, ', ' order by privilege_type),
                   case when relkind = 'S' then 'sequence' else 'table' end, nspname, relname, rolname)
  from rel_privs group by nspname, relname, relkind, rolname
  union all
  select 3, format('grant %s (%s) on table %I.%I to %I;', privilege_type, string_agg(quote_ident(attname), ', ' order by attname), nspname, relname, rolname)
  from col_privs group by nspname, relname, privilege_type, rolname
  union all
  select 4, format('grant execute on function %s to %s;', oid::regprocedure, case when rolname = 'public' then 'public' else quote_ident(rolname) end)
  from fn_privs
) s order by o, stmt;
