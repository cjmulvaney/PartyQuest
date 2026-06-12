-- Party Quest — Permanent Demo Event Seed (v2.13)
-- Creates a always-on demo event so a prospective organizer can feel the player
-- experience in two taps from the homepage, without creating an event first.
--
-- How the frontend hooks in:
--   • Home shows "Try it as a guest" when VITE_DEMO_ACCESS_CODE is set.
--   • That button routes the visitor to /play/<VITE_DEMO_ACCESS_CODE>.
--   • Set VITE_DEMO_ACCESS_CODE = 'DEMOPLAY' (the shared guest below) after running this.
--
-- The demo is keyed off event_code 'DEMO01' everywhere (admin metrics exclude it
-- by that code). Re-running this script is safe — it cleans up any prior demo first.
--
-- Paste into the Supabase SQL Editor. Requires pg_cron for the nightly reset.

-- 0. Clean slate (cascades to participants, missions, completions)
delete from events where event_code = 'DEMO01';

-- 1. The demo event — active, with a far-future end so it never auto-ends
insert into events (name, event_type, start_time, end_time, event_code, status,
                    anonymity_enabled, feed_mode, feed_photos_enabled,
                    feed_comments_enabled, feed_reactions_enabled)
values (
  'Party Quest Demo',
  'house party',
  now() - interval '1 hour',
  now() + interval '10 years',
  'DEMO01',
  'active',
  false,
  'secret',
  true,
  true,
  true
);

-- 2. Config — 4 missions per person, all unlocked
insert into event_config (event_id, mission_count, unlock_type, tag_filters)
select id, 4, 'all_at_once', '{}'
from events where event_code = 'DEMO01';

-- 3. Participants — a lively cast plus the shared "You" guest (access_code DEMOPLAY)
insert into participants (event_id, name, access_code, joined_at, source) values
  ((select id from events where event_code = 'DEMO01'), 'You',    'DEMOPLAY', now(), 'self'),
  ((select id from events where event_code = 'DEMO01'), 'Priya',  'DEMOPRYA', now() - interval '40 min', 'self'),
  ((select id from events where event_code = 'DEMO01'), 'Marcus', 'DEMOMRCS', now() - interval '38 min', 'self'),
  ((select id from events where event_code = 'DEMO01'), 'Lena',   'DEMOLENA', now() - interval '35 min', 'self'),
  ((select id from events where event_code = 'DEMO01'), 'Diego',  'DEMODIEG', now() - interval '30 min', 'self'),
  ((select id from events where event_code = 'DEMO01'), 'Aisha',  'DEMOAISH', now() - interval '25 min', 'self');

-- 4. Assign 4 missions to every participant (random from the active pool)
do $$
declare
  v_event uuid := (select id from events where event_code = 'DEMO01');
  p record;
begin
  for p in select id from participants where event_id = v_event loop
    insert into participant_missions (participant_id, mission_id, unlock_time)
    select p.id, m.id, null
    from missions m where m.active = true
    order by random() limit 4;
  end loop;
end $$;

-- 5. Pre-complete some of the cast's missions so the leaderboard + feed look alive.
--    (The "You" guest starts at zero so a visitor has something to do.)
do $$
declare
  v_event uuid := (select id from events where event_code = 'DEMO01');
  rec record;
  to_complete int;
begin
  for rec in
    select pr.id as participant_id, pr.name
    from participants pr
    where pr.event_id = v_event and pr.access_code <> 'DEMOPLAY'
  loop
    -- Vary how many each has done so standings aren't flat (1–4)
    to_complete := 1 + floor(random() * 4)::int;
    update participant_missions pm
    set completed = true,
        completed_at = now() - (random() * interval '30 minutes'),
        notes = case when random() < 0.4 then 'Nailed it 😄' else null end
    where pm.id in (
      select id from participant_missions
      where participant_id = rec.participant_id
      order by random() limit to_complete
    );
  end loop;
end $$;

-- 6. Nightly reset — wipe the shared guest's progress so the demo is fresh each day.
create or replace function reset_demo_event() returns void
language plpgsql security definer as $$
declare
  v_guest uuid := (select id from participants where access_code = 'DEMOPLAY');
begin
  if v_guest is null then return; end if;
  delete from completion_reactions where participant_id = v_guest;
  delete from completion_comments  where participant_id = v_guest;
  update participant_missions
  set completed = false, completed_at = null, retracted_at = null,
      notes = null, photo_url = null
  where participant_id = v_guest;
end $$;

-- Schedule the reset for 8:00 AM UTC daily (re-running replaces the job)
select cron.unschedule('demo-reset') where exists (
  select 1 from cron.job where jobname = 'demo-reset'
);
select cron.schedule('demo-reset', '0 8 * * *', 'select reset_demo_event()');
