-- Adventure Quiz: question kinds and config, every personality reachable,
-- retaking replaces the previous result.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

create function pg_temp.mk_user(p_id uuid, p_phone text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, phone, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          p_phone, '{}'::jsonb, now(), now());
$$;
create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;
-- Answer ids by position: element i = answer sort_order for question i.
create function pg_temp.picks(p_positions int[]) returns uuid[] language sql as $$
  select array_agg(a.id order by q.sort_order)
  from public.quiz_questions q
  join public.quiz_answers a on a.question_id = q.id and a.sort_order = p_positions[q.sort_order]
  where q.is_active;
$$;
-- Submit as a user and return the badge code awarded.
create function pg_temp.badge_for(p_user uuid, p_positions int[]) returns text language plpgsql as $$
declare v_code text;
begin
  perform pg_temp.login(p_user);
  select b.code into v_code from public.submit_quiz(pg_temp.picks(p_positions)) r join public.badges b on b.id = r.badge_id;
  perform pg_temp.logout();
  return v_code;
end;
$$;

-- Structure
select has_column('public', 'quiz_questions', 'kind', 'quiz_questions has kind');
select has_column('public', 'quiz_questions', 'config', 'quiz_questions has config');
select has_column('public', 'quiz_answers', 'image_url', 'quiz_answers has image_url');
select enum_has_labels('public', 'quiz_question_kind', array['photo_list', 'emoji_list', 'glass', 'seat', 'slider'],
  'quiz_question_kind lists the Figma interactions');
select throws_ok(
  $$ insert into public.quiz_questions (prompt, config) values ('Bad config', '[]') $$,
  '23514', null, 'config must be a JSON object');

-- Seeded quiz matches Figma: 6 questions, one per kind and two photo lists
select results_eq(
  $$ select kind::text from public.quiz_questions where is_active order by sort_order $$,
  $$ values ('photo_list'), ('photo_list'), ('glass'), ('emoji_list'), ('seat'), ('slider') $$,
  'six questions in Figma order');
select is(
  (select count(*)::int from public.quiz_answers a join public.quiz_questions q on q.id = a.question_id
   where q.kind in ('photo_list', 'emoji_list') and a.image_url is null),
  0, 'photo and emoji answers all have an image');

-- Config points at real answers
select is(
  (select count(*)::int from public.quiz_questions q
   cross join lateral (
     select (q.config ->> 'top')::int as pos where q.kind = 'glass'
     union all select (q.config ->> 'bottom')::int where q.kind = 'glass'
     union all select value::int from jsonb_array_elements_text(q.config -> 'columns') where q.kind = 'seat'
     union all select (b ->> 'answer')::int from jsonb_array_elements(q.config -> 'buckets') b where q.kind = 'slider'
   ) refs
   where not exists (select 1 from public.quiz_answers a where a.question_id = q.id and a.sort_order = refs.pos)),
  0, 'glass halves, seat columns and temperature buckets all map to answers');

-- Every personality badge can be earned
select pg_temp.mk_user('77777777-0000-4000-a000-000000000001', '923990000071');
select is(pg_temp.badge_for('77777777-0000-4000-a000-000000000001', '{1,1,1,2,1,1}'), 'nature-soul', 'Nature Lover is reachable');
select is(pg_temp.badge_for('77777777-0000-4000-a000-000000000001', '{3,3,2,1,2,1}'), 'trailblazer', 'Adventure Lover is reachable');
select is(pg_temp.badge_for('77777777-0000-4000-a000-000000000001', '{5,5,1,3,1,2}'), 'culture-seeker', 'Culture Lover is reachable');
select is(pg_temp.badge_for('77777777-0000-4000-a000-000000000001', '{5,5,2,3,2,3}'), 'foodie-explorer', 'Food Lover is reachable');
select is(pg_temp.badge_for('77777777-0000-4000-a000-000000000001', '{2,2,1,2,1,4}'), 'zen-wanderer', 'Wellness Lover is reachable');
select is(pg_temp.badge_for('77777777-0000-4000-a000-000000000001', '{4,4,2,1,2,3}'), 'social-butterfly', 'Party Lover is reachable');

-- Retaking replaces the previous result (the last retake above was Party Lover)
select is(
  (select count(*)::int from public.quiz_results where user_id = '77777777-0000-4000-a000-000000000001'),
  1, 'only the latest quiz result is kept');
select results_eq(
  $$ select b.code::text from public.user_badges ub join public.badges b on b.id = ub.badge_id
     where ub.user_id = '77777777-0000-4000-a000-000000000001' and b.kind = 'personality' $$,
  $$ values ('social-butterfly') $$,
  'only the latest personality badge is kept');
select is(
  (select b.code::text from public.profiles p join public.badges b on b.id = p.personality_badge_id
   where p.id = '77777777-0000-4000-a000-000000000001'),
  'social-butterfly', 'the profile shows the latest personality');

-- Still one answer per question, and guests cannot submit
select pg_temp.login('77777777-0000-4000-a000-000000000001');
select throws_ok(
  $$ select public.submit_quiz((select array_agg(a.id) from public.quiz_answers a
       join public.quiz_questions q on q.id = a.question_id where q.sort_order = 1)) $$,
  '22023', 'Answer each question once', 'two answers to one question are rejected');
select pg_temp.logout();

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select public.submit_quiz(array[]::uuid[]) $$,
  '42501', null, 'guests cannot submit the quiz');
select isnt_empty($$ select 1 from public.quiz_questions $$, 'guests can read the quiz');

select * from finish();
rollback;
