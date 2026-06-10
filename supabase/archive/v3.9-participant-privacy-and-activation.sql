-- v3.9 — Participant privacy + event activation (companion to app v2.12)
--
-- 1. Locks down public SELECT on participants and events (P0-3):
--    phone numbers and access codes were readable by anyone with the anon key.
-- 2. Adds safe public views (participants_public, events_public) for
--    participant-facing reads.
-- 3. Moves access-code lookup behind a security-definer RPC.
-- 4. Adds organizer DELETE policy on participant_missions (P1-1: mission
--    editor needs to delete rows trimmed during rebalance).
-- 5. Schedules pg_cron job to auto-activate upcoming events (P0-4).
-- 6. Fixes schedule_sms_reminder(): skip past-due reminders for events
--    created after their start time (P2-7).
--
-- After applying in prod: fold into schema.sql and move this file to ./archive/.

-- ============================================================
-- 1. Lock down base tables
-- ============================================================

drop policy "Participants are publicly readable" on participants;

create policy "Organizers and admins can read participants"
  on participants for select using (
    is_admin() or exists (
      select 1 from events
      where events.id = participants.event_id
        and events.organizer_id = (select auth.uid())
    )
  );

drop policy "Events are readable by anyone" on events;

create policy "Organizers and admins can read events"
  on events for select using (
    is_admin() or organizer_id = (select auth.uid())
  );

-- ============================================================
-- 2. Public views with only safe columns
-- ============================================================
-- Owned by postgres, so they bypass RLS by design (security_invoker
-- defaults to false). That is the point: anon reads go through these
-- views and can only ever see the columns listed here.

create view public.participants_public as
  select id, event_id, name, is_active, joined_at from participants;
grant select on public.participants_public to anon, authenticated;

create view public.events_public as
  select id, name, event_type, start_time, end_time, event_code, status,
         anonymity_enabled, feed_mode, max_participants,
         feed_photos_enabled, feed_comments_enabled, feed_reactions_enabled,
         feed_interactive_comments_enabled, feed_hidden
  from events;
grant select on public.events_public to anon, authenticated;

-- ============================================================
-- 3. Access-code lookup RPC
-- ============================================================
-- Replaces direct anon selects on participants by access_code
-- (Play, Feedback). Returns only the fields those flows need.

create or replace function public.rpc_get_participant_by_access_code(p_access_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v record;
begin
  select id, name, event_id, survey_submitted into v
    from participants
    where access_code = upper(trim(p_access_code)) and is_active = true;
  if v is null then
    raise exception 'Participant not found';
  end if;
  return jsonb_build_object(
    'id', v.id,
    'name', v.name,
    'event_id', v.event_id,
    'survey_submitted', v.survey_submitted
  );
end;
$$;
grant execute on function public.rpc_get_participant_by_access_code(text) to anon, authenticated;

-- ============================================================
-- 4. Organizer DELETE policy on participant_missions
-- ============================================================

create policy "Organizers can delete participant missions"
  on participant_missions for delete using (
    exists (
      select 1 from participants
      join events on events.id = participants.event_id
      where participants.id = participant_missions.participant_id
        and events.organizer_id = (select auth.uid())
    )
  );

-- ============================================================
-- 5. Auto-activate upcoming events at start_time
-- ============================================================
-- Events created in advance never flipped upcoming -> active, so /join
-- and is_active_participant() checks failed at party time. Runs every
-- minute. Ending stays manual (parties run long; ending triggers the
-- feedback flow).

select cron.schedule('event-auto-activate', '* * * * *', $$
  update events set status = 'active'
  where status = 'upcoming' and start_time <= now();
$$);

-- ============================================================
-- 6. Don't queue past-due SMS reminders
-- ============================================================
-- Events created after their start time got a reminder row that was
-- immediately due, so guests received "starts in 15 minutes!" after
-- the event had already started.

create or replace function public.schedule_sms_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.start_time is not null and new.start_time > now() then
      insert into sms_reminders (event_id, send_at)
      values (new.id, new.start_time - interval '15 minutes');
    end if;
  elsif tg_op = 'UPDATE' then
    if new.start_time is distinct from old.start_time and new.start_time is not null then
      delete from sms_reminders where event_id = new.id and sent = false;
      if new.start_time > now() then
        insert into sms_reminders (event_id, send_at)
        values (new.id, new.start_time - interval '15 minutes');
      end if;
    end if;
  end if;
  return new;
end;
$$;
