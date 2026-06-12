-- v3.10 — Custom (event-scoped) missions
-- Organizers can add their own missions to an event. Custom rows live in the
-- existing `missions` table with event_id set; library rows keep event_id null.
-- See custom-missions-spec.md (Option A).

-- 1. Columns ---------------------------------------------------------------

alter table missions add column if not exists event_id   uuid references events(id) on delete cascade;
alter table missions add column if not exists created_by  uuid references auth.users(id) on delete set null;

create index if not exists idx_missions_event on missions(event_id);

-- 2. Write policies --------------------------------------------------------
-- Admins manage library rows (event_id null); organizers manage custom rows
-- on events they own. Replaces the three admin-only write policies.

drop policy if exists "Admins can insert missions" on missions;
drop policy if exists "Admins can update missions" on missions;
drop policy if exists "Admins can delete missions" on missions;

create policy "Insert library or own-event missions"
  on missions for insert with check (
    (event_id is null and is_admin())
    or (event_id is not null and exists (
      select 1 from events
      where events.id = missions.event_id
        and events.organizer_id = (select auth.uid())
    ))
  );

-- Admins can update/delete ALL missions (library + any event's custom rows, for
-- abuse cleanup); organizers can update/delete only their own event's customs.
create policy "Update library or own-event missions"
  on missions for update using (
    is_admin()
    or (event_id is not null and exists (
      select 1 from events
      where events.id = missions.event_id
        and events.organizer_id = (select auth.uid())
    ))
  );

create policy "Delete library or own-event missions"
  on missions for delete using (
    is_admin()
    or (event_id is not null and exists (
      select 1 from events
      where events.id = missions.event_id
        and events.organizer_id = (select auth.uid())
    ))
  );

-- The base select policy is unchanged: using (active = true or is_admin()).
-- But organizers aren't admins, so without an extra read grant they can't see
-- their own active=false rows — which makes deactivating an assigned custom
-- mission (active=false) fail, since the new row would violate the select policy.
-- Add a scoped read policy for organizers' own-event missions (any active state).
create policy "Organizers read own-event missions"
  on missions for select using (
    event_id is not null and exists (
      select 1 from events where events.id = missions.event_id
        and events.organizer_id = (select auth.uid()))
  );

-- 3. Cap: <= 20 custom missions per event ---------------------------------
-- Aggregate check can't be a column constraint; enforce with a BEFORE trigger.

create or replace function enforce_custom_mission_cap()
returns trigger
language plpgsql
as $$
begin
  if new.event_id is not null then
    -- count only active rows: matches the UI and the cap's purpose (only active
    -- missions are allocated); deactivated customs don't count toward the limit.
    if (select count(*) from missions where event_id = new.event_id and active = true) >= 20 then
      raise exception 'Custom mission limit (20) reached for this event'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_custom_mission_cap on missions;
create trigger trg_custom_mission_cap
  before insert on missions
  for each row execute function enforce_custom_mission_cap();
