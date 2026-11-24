-- Adventure Quiz as designed in Figma ("Costumer Dashboard (Adventure Quiz)"):
-- each question has a kind (photo list, emoji list, glass, plane seat,
-- thermometer slider) and a kind-specific config. Every interaction still maps
-- to quiz_answers rows, so scoring in submit_quiz is unchanged.

create type public.quiz_question_kind as enum ('photo_list', 'emoji_list', 'glass', 'seat', 'slider');

alter table public.quiz_questions
  add column kind public.quiz_question_kind not null default 'photo_list',
  -- Kind-specific settings, keyed by answer sort_order:
  --   glass:  {"top": 1, "bottom": 2}                          which half picks which answer
  --   seat:   {"rows": 3, "columns": [1, 2, 2, 1]}             seat column -> answer
  --   slider: {"min": 0, "max": 50, "default": 20, "unit": "C",
  --            "buckets": [{"answer": 1, "max": 14}, ...]}      value <= max -> answer (last bucket open-ended)
  add column config jsonb not null default '{}'
    constraint quiz_questions_config_object check (jsonb_typeof(config) = 'object');

-- Photo or emoji shown with the answer (storage ref, e.g. storage://seed-media/quiz/q1-hike.jpg).
alter table public.quiz_answers add column image_url text;

-- ---------------------------------------------------------------------------
-- submit_quiz: retaking replaces the previous result
-- ---------------------------------------------------------------------------
-- Same signature and scoring as before; now clears the user's earlier quiz
-- results and quiz-awarded personality badge first, so the profile shows only
-- the latest personality.
create or replace function public.submit_quiz(p_answer_ids uuid[])
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

  -- Retake: the new result replaces the old one.
  delete from public.quiz_results where user_id = v_uid;
  delete from public.user_badges ub
  using public.badges b
  where ub.badge_id = b.id and ub.user_id = v_uid and ub.source = 'quiz' and b.kind = 'personality';

  insert into public.quiz_results (user_id, answer_ids, trait_scores, badge_id)
  values (v_uid, p_answer_ids, v_scores, v_badge_id)
  returning * into v_result;

  if v_badge_id is not null then
    insert into public.user_badges (user_id, badge_id, source)
    values (v_uid, v_badge_id, 'quiz')
    on conflict do nothing;
  end if;
  update public.profiles set personality_badge_id = v_badge_id where id = v_uid;

  return v_result;
end;
$$;

revoke execute on function public.submit_quiz from anon;
