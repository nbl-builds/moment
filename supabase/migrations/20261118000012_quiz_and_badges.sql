-- Adventure Quiz, personality badges and recommendations.

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null unique,
  name text not null,
  description text,
  icon text, -- Huge Icons name or storage path
  kind public.badge_kind not null default 'personality',
  primary_trait text, -- personality badges: the trait that earns it
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.profiles
  add constraint profiles_personality_badge_fk foreign key (personality_badge_id) references public.badges (id) on delete set null;
create index profiles_personality_badge_idx on public.profiles (personality_badge_id);

-- How strongly each badge likes each tag; drives "Just For You".
create table public.badge_tags (
  badge_id uuid not null references public.badges (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  weight numeric(4, 2) not null default 1 check (weight > 0),
  primary key (badge_id, tag_id)
);
create index badge_tags_tag_idx on public.badge_tags (tag_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  label text not null,
  icon text,
  trait_weights jsonb not null default '{}', -- e.g. {"adventure": 2, "nature": 1}
  sort_order integer not null default 0
);
create index quiz_answers_question_idx on public.quiz_answers (question_id, sort_order);

create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answer_ids uuid[] not null,
  trait_scores jsonb not null,
  badge_id uuid references public.badges (id) on delete set null,
  completed_at timestamptz not null default now()
);
create index quiz_results_user_idx on public.quiz_results (user_id, completed_at desc);
create index quiz_results_badge_idx on public.quiz_results (badge_id);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  source public.badge_source not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
create index user_badges_badge_idx on public.user_badges (badge_id);

-- ---------------------------------------------------------------------------
-- submit_quiz: score answers server-side, award the matching badge
-- ---------------------------------------------------------------------------
create function public.submit_quiz(p_answer_ids uuid[])
returns public.quiz_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_scores jsonb;
  v_top_trait text;
  v_badge_id uuid;
  v_result public.quiz_results;
begin
  if v_uid is null then
    raise exception 'Sign in to take the quiz' using errcode = '42501';
  end if;

  if (select count(distinct a.question_id) from public.quiz_answers a where a.id = any (p_answer_ids))
     <> cardinality(p_answer_ids) then
    raise exception 'Answer each question once' using errcode = '22023';
  end if;

  select coalesce(jsonb_object_agg(trait, score), '{}'::jsonb) into v_scores
  from (
    select w.key as trait, sum(w.value::numeric) as score
    from public.quiz_answers a
    cross join lateral jsonb_each_text(a.trait_weights) w
    where a.id = any (p_answer_ids)
    group by w.key
  ) s;

  select key into v_top_trait
  from jsonb_each_text(v_scores)
  order by value::numeric desc, key
  limit 1;

  select id into v_badge_id from public.badges
  where kind = 'personality' and is_active and primary_trait = v_top_trait
  order by sort_order
  limit 1;

  insert into public.quiz_results (user_id, answer_ids, trait_scores, badge_id)
  values (v_uid, p_answer_ids, v_scores, v_badge_id)
  returning * into v_result;

  if v_badge_id is not null then
    insert into public.user_badges (user_id, badge_id, source)
    values (v_uid, v_badge_id, 'quiz')
    on conflict do nothing;
    update public.profiles set personality_badge_id = v_badge_id where id = v_uid;
  end if;

  return v_result;
end;
$$;

revoke execute on function public.submit_quiz from anon;

-- ---------------------------------------------------------------------------
-- recommended_listings: "Just For You"
-- ---------------------------------------------------------------------------
-- Ranks published listings by how well their tags match the user's badge,
-- then by popularity. Falls back to popularity for users without a badge.
create function public.recommended_listings(p_limit integer default 20, p_city text default null)
returns setof public.listings
language sql
stable
security invoker
set search_path = ''
as $$
  select l.*
  from public.listings l
  left join lateral (
    select sum(bt.weight) as affinity
    from public.listing_tags lt
    join public.badge_tags bt on bt.tag_id = lt.tag_id
    join public.profiles p on p.personality_badge_id = bt.badge_id
    where lt.listing_id = l.id and p.id = (select auth.uid())
  ) m on true
  where l.status = 'published'
    and private.is_business_active(l.business_id)
    and (p_city is null or l.city = p_city)
  order by coalesce(m.affinity, 0) desc, l.popularity_score desc, l.rating_avg desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.badges enable row level security;
alter table public.badge_tags enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_results enable row level security;
alter table public.user_badges enable row level security;

create policy "badges: public read" on public.badges
  for select to anon, authenticated using (true);
create policy "badges: admins manage" on public.badges
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "badge_tags: public read" on public.badge_tags
  for select to anon, authenticated using (true);
create policy "badge_tags: admins manage" on public.badge_tags
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "quiz_questions: public read active" on public.quiz_questions
  for select to anon, authenticated using (is_active);
create policy "quiz_questions: admins manage" on public.quiz_questions
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy "quiz_answers: public read" on public.quiz_answers
  for select to anon, authenticated using (true);
create policy "quiz_answers: admins manage" on public.quiz_answers
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- Results are written by submit_quiz.
create policy "quiz_results: own or admin read" on public.quiz_results
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));

-- Badges are shown on profiles, so they are publicly readable.
create policy "user_badges: public read" on public.user_badges
  for select to anon, authenticated using (true);
create policy "user_badges: admins manage" on public.user_badges
  for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
