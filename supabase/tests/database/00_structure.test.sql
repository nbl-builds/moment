-- Structural guarantees that should hold for every future migration too.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select is_empty(
  $$ select tablename::text from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'every public table has RLS enabled'
);

select is_empty(
  $$ select t.tablename::text from pg_tables t
     where t.schemaname = 'public'
       and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename) $$,
  'every public table has at least one policy'
);

select is_empty(
  $$ select n.nspname || '.' || p.proname
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'every security definer function pins search_path'
);

-- Each foreign key's referencing column (the last one, for composite keys
-- that lead with business_id) is the leading column of some index.
select is_empty(
  $$ select c.conrelid::regclass::text || '.' || c.conname
     from pg_constraint c
     where c.contype = 'f' and c.connamespace = 'public'::regnamespace
       and not exists (
         select 1 from pg_index i
         where i.indrelid = c.conrelid
           and (i.indkey::int2[])[0] = c.conkey[cardinality(c.conkey)]
       ) $$,
  'every foreign key is indexed'
);

select is_empty(
  $$ select table_name::text from information_schema.columns
     where table_schema = 'public' and column_name like '%amount' and data_type not in ('integer', 'bigint') $$,
  'money columns are integers (minor units)'
);

select has_function('public', 'create_booking', 'create_booking exists');
select has_function('public', 'get_available_times', 'get_available_times exists');
select has_function('public', 'submit_quiz', 'submit_quiz exists');

select * from finish();
rollback;
