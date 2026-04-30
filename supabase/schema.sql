-- Party Quest — Canonical Database Schema
-- Snapshot taken 2026-04-17 AFTER v3.4-missions-v2.
-- Reflects the live state of the Supabase project (ynffsjqnwhvyzrerbxor).
--
-- This file IS the current source of truth. Running it against an empty
-- database will produce the same shape as production.
--
-- History of incremental migrations is preserved in ./archive/
-- (phases 3/5, v2.1, v2.3, v2.4, v2.6, v2.7, v2.8, v2.9, v2.10,
--  v3.0, v3.1, v3.2, v3.3, v3.4).
--
-- After a new migration is applied in prod, fold its DDL into this file
-- and move the migration SQL into ./archive/.

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_net      with schema extensions;
create extension if not exists pg_cron;  -- creates the `cron` schema

-- ============================================================
-- TABLES
-- ============================================================

-- Categories for missions
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  created_at  timestamptz default now()
);

-- Mission library
create table missions (
  id           uuid primary key default uuid_generate_v4(),
  text         text not null,
  category_id  uuid references categories(id) on delete set null,
  tags         text[] default '{}',
  active       boolean default true,
  creator_name text,                       -- v2.1: who created this mission
  created_at   timestamptz default now()
);

-- Events
create table events (
  id                                uuid primary key default uuid_generate_v4(),
  organizer_id                      uuid references auth.users(id) on delete cascade,
  name                              text not null,
  event_type                        text check (event_type in (
    'birthday','house party','bachelorette','work offsite','weekend trip','other'
  )),
  start_time                        timestamptz not null,
  end_time                          timestamptz not null,
  event_code                        text unique not null,
  anonymity_enabled                 boolean default false,
  how_heard                         text,
  email_opt_in                      boolean default false,
  organizer_email                   text,
  status                            text default 'upcoming' check (status in ('upcoming','active','ended')),
  draft_data                        jsonb,                             -- add-draft-support: in-progress draft state
  feed_mode                         text default 'secret' check (feed_mode in ('secret','transparent')),  -- v2.1
  max_participants                  integer,                           -- v2.1: cap for self-registration
  feed_photos_enabled               boolean default true,              -- v2.2
  feed_comments_enabled             boolean default true,              -- v2.2
  feed_reactions_enabled            boolean default true,              -- v2.3
  feed_interactive_comments_enabled boolean default false,             -- v2.3
  feed_hidden                       boolean default false,             -- v2.4
  feedback_sent_at                  timestamptz,                       -- v2.10: prevents duplicate feedback SMS
  created_at                        timestamptz default now()
);

-- Event configuration (1:1 with events)
create table event_config (
  id               uuid primary key default uuid_generate_v4(),
  event_id         uuid references events(id) on delete cascade unique,
  mission_count    integer default 3 check (mission_count between 1 and 5),
  unlock_type      text default 'all_at_once' check (unlock_type in ('all_at_once','timed')),
  unlock_schedule  jsonb default '[]',
  tag_filters      text[] default '{}',
  allocation_mode  text default 'balanced' check (allocation_mode in ('balanced','random'))  -- v3.3
);

-- Participants
create table participants (
  id               uuid primary key default uuid_generate_v4(),
  event_id         uuid references events(id) on delete cascade,
  name             text not null,
  access_code      text unique not null,
  joined_at        timestamptz,
  is_active        boolean default true,                               -- v2.1 soft-delete
  source           text default 'manual' check (source in ('manual','self')),  -- v2.1
  phone            text,                                               -- v2.1 (optional)
  sms_sent_at      timestamptz,                                        -- v2.7: idempotency for outbound SMS
  survey_submitted boolean default false                               -- v2.10
);

-- Participant missions (assigned missions per participant)
create table participant_missions (
  id                    uuid primary key default uuid_generate_v4(),
  participant_id        uuid references participants(id) on delete cascade,
  mission_id            uuid references missions(id) on delete cascade,
  completed             boolean default false,
  notes                 text,
  photo_url             text,
  completed_at          timestamptz,
  unlock_time           timestamptz
);

-- Feedback (free-form text during/after events)
create table feedback (
  id             uuid primary key default uuid_generate_v4(),
  event_id       uuid references events(id) on delete set null,
  participant_id uuid references participants(id) on delete set null,
  text           text not null,
  created_at     timestamptz default now()
);

-- v2.3: Emoji reactions on completion feed entries
create table completion_reactions (
  id                     uuid primary key default uuid_generate_v4(),
  participant_mission_id uuid references participant_missions(id) on delete cascade,
  participant_id         uuid references participants(id) on delete cascade,
  emoji                  text not null,
  created_at             timestamptz default now(),
  unique(participant_mission_id, participant_id, emoji)
);

-- v2.3: Interactive comments on completion feed entries
create table completion_comments (
  id                     uuid primary key default uuid_generate_v4(),
  participant_mission_id uuid references participant_missions(id) on delete cascade,
  participant_id         uuid references participants(id) on delete cascade,
  text                   text not null,
  created_at             timestamptz default now()
);

-- v2.7: Queue of SMS reminder tasks written by trigger, drained by pg_cron
create table sms_reminders (
  id       uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  send_at  timestamptz not null,
  sent     boolean default false
);

-- v2.10: Post-event survey responses
create table event_surveys (
  id                  uuid primary key default uuid_generate_v4(),
  event_id            uuid references events(id) on delete cascade,
  participant_id      uuid references participants(id) on delete set null,
  rating              smallint check (rating between 1 and 5),
  increased_enjoyment text check (increased_enjoyment in ('yes','somewhat','no')),
  met_someone         text check (met_someone in ('yes','kind_of','no')),
  would_recommend     text check (would_recommend in ('yes','no')),
  open_text           text,
  submitted_at        timestamptz default now(),
  unique (participant_id)  -- one response per participant
);

-- v2.10: Anonymous, hashed phone registry for cross-event "known player" detection
create table known_players (
  phone_hash  text primary key,          -- SHA-256 of normalized E.164 phone
  event_count integer default 1,
  first_seen  timestamptz default now(),
  last_seen   timestamptz default now()
);

-- v3.0: Admin email allowlist (powers is_admin())
create table admin_emails (
  email      text primary key,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_missions_category                  on missions(category_id);
create index idx_events_organizer                   on events(organizer_id);
create index idx_events_code                        on events(event_code);
create index idx_events_status                      on events(status);
create index idx_participants_event                 on participants(event_id);
create index idx_participants_access_code           on participants(access_code);
-- v2.6: case-insensitive uniqueness of active participant names per event
create unique index idx_unique_active_name_per_event
  on participants(event_id, lower(trim(name)))
  where is_active = true;
create index idx_participant_missions_participant   on participant_missions(participant_id);
create index idx_participant_missions_mission       on participant_missions(mission_id);
create index idx_feedback_event                     on feedback(event_id);
create index idx_feedback_participant_id            on feedback(participant_id);                -- v3.1
create index idx_completion_reactions_pm            on completion_reactions(participant_mission_id);
create index idx_completion_reactions_participant   on completion_reactions(participant_id);
create index idx_completion_comments_pm             on completion_comments(participant_mission_id);
create index idx_completion_comments_participant    on completion_comments(participant_id);
create index idx_sms_reminders_event_id             on sms_reminders(event_id);                 -- v3.1
create index idx_sms_reminders_due                  on sms_reminders(send_at) where sent = false;  -- v3.1
create index idx_event_surveys_event_id             on event_surveys(event_id);                 -- v3.1

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Random access-code generator (excludes ambiguous chars I/O/0/1)
create or replace function public.generate_access_code(code_length integer default 6)
returns text
language plpgsql
set search_path = public
as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i      integer;
begin
  for i in 1..code_length loop
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  end loop;
  return result;
end;
$$;

-- v3.0: is the caller in admin_emails?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_emails
    where email = (select email from auth.users where id = auth.uid())
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- v3.2: helper used by tightened feed-interaction INSERT policies
create or replace function public.is_active_participant(p_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from participants p
    join events e on e.id = p.event_id
    where p.id = p_participant_id
      and e.status = 'active'
  );
$$;

-- v2.1 (fixed in v2.9): self-registration with optional phone
create or replace function public.rpc_register_participant(
  p_event_code text,
  p_name       text,
  p_phone      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event        record;
  v_code         text;
  v_participant  record;
  v_attempt      int := 0;
  v_max_attempts int := 5;
  v_count        int;
  v_trimmed_name text;
begin
  v_trimmed_name := trim(p_name);

  if v_trimmed_name = '' then
    raise exception 'Name is required';
  end if;

  select id, name, status, max_participants
    into v_event
    from events
    where event_code = upper(trim(p_event_code));

  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.status = 'ended' then
    raise exception 'This event has already ended';
  end if;

  if v_event.status not in ('active','upcoming') then
    raise exception 'Event is not open yet';
  end if;

  if v_event.max_participants is not null then
    select count(*) into v_count
      from participants
      where event_id = v_event.id and is_active = true;

    if v_count >= v_event.max_participants then
      raise exception 'Event is full';
    end if;
  end if;

  if exists (
    select 1 from participants
    where event_id = v_event.id
      and lower(trim(name)) = lower(v_trimmed_name)
      and is_active = true
  ) then
    raise exception 'Name already taken';
  end if;

  loop
    v_code := generate_access_code(6);
    begin
      insert into participants (event_id, name, access_code, joined_at, source, is_active, phone)
      values (v_event.id, v_trimmed_name, v_code, now(), 'self', true, p_phone)
      returning * into v_participant;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= v_max_attempts then
        raise exception 'Failed to generate unique access code';
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'id',          v_participant.id,
    'name',        v_participant.name,
    'access_code', v_participant.access_code,
    'event_id',    v_participant.event_id,
    'phone',       v_participant.phone
  );
end;
$$;

grant execute on function public.rpc_register_participant(text, text, text) to anon, authenticated;

-- v2.1: join an active event via event + access codes
create or replace function public.rpc_join_event(
  p_event_code  text,
  p_access_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event       record;
  v_participant record;
begin
  select id, name, status
    into v_event
    from events
    where event_code = upper(trim(p_event_code));

  if v_event is null then
    raise exception 'Event not found';
  end if;

  if v_event.status = 'ended' then
    raise exception 'This event has already ended';
  end if;

  if v_event.status != 'active' then
    raise exception 'This event is not open yet';
  end if;

  select * into v_participant
    from participants
    where event_id = v_event.id
      and access_code = upper(trim(p_access_code))
      and is_active = true;

  if v_participant is null then
    raise exception 'Access code not found for this event';
  end if;

  if v_participant.joined_at is null then
    update participants set joined_at = now() where id = v_participant.id;
    v_participant.joined_at := now();
  end if;

  return jsonb_build_object(
    'id',          v_participant.id,
    'name',        v_participant.name,
    'access_code', v_participant.access_code,
    'joined_at',   v_participant.joined_at,
    'event_id',    v_participant.event_id
  );
end;
$$;

grant execute on function public.rpc_join_event(text, text) to anon, authenticated;

-- v2.6: mark a mission complete
create or replace function public.rpc_complete_mission(
  p_access_code text,
  p_mission_id  uuid,
  p_notes       text default null,
  p_photo_url   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant record;
  v_pm          record;
begin
  select * into v_participant
    from participants
    where access_code = upper(trim(p_access_code))
      and is_active = true;

  if v_participant is null then
    raise exception 'Participant not found';
  end if;

  select * into v_pm
    from participant_missions
    where participant_id = v_participant.id
      and mission_id = p_mission_id;

  if v_pm is null then
    raise exception 'Mission not assigned to this participant';
  end if;

  update participant_missions
    set completed    = true,
        notes        = coalesce(p_notes, notes),
        photo_url    = coalesce(p_photo_url, photo_url),
        completed_at = now()
    where id = v_pm.id;

  return jsonb_build_object('id', v_pm.id, 'completed', true, 'completed_at', now());
end;
$$;

grant execute on function public.rpc_complete_mission(text, uuid, text, text) to anon, authenticated;

-- v3.2: access-code-gated reaction removal (replaces permissive DELETE policy)
create or replace function public.rpc_remove_reaction(
  p_participant_id uuid,
  p_reaction_id    uuid,
  p_access_code    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists (
    select 1
    from participants p
    join completion_reactions r on r.participant_id = p.id
    where p.id = p_participant_id
      and p.access_code = p_access_code
      and r.id = p_reaction_id
  ) into v_ok;

  if not v_ok then
    raise exception 'Not authorized to remove this reaction'
      using errcode = '42501';
  end if;

  delete from completion_reactions
  where id = p_reaction_id
    and participant_id = p_participant_id;
end;
$$;

grant execute on function public.rpc_remove_reaction(uuid, uuid, text) to anon, authenticated;

-- v2.9: organizer assigns missions to a participant (bypasses RLS)
create or replace function public.rpc_assign_participant_missions(
  p_participant_id uuid,
  p_mission_ids    uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from participants where id = p_participant_id and is_active = true
  ) then
    raise exception 'Participant not found';
  end if;

  insert into participant_missions (participant_id, mission_id)
  select p_participant_id, unnest(p_mission_ids);
end;
$$;

grant execute on function public.rpc_assign_participant_missions(uuid, uuid[]) to anon, authenticated;

-- v2.10: atomic survey submit + flag participant.survey_submitted
create or replace function public.rpc_submit_survey(
  p_participant_id      uuid,
  p_event_id            uuid,
  p_rating              smallint,
  p_increased_enjoyment text,
  p_met_someone         text,
  p_would_recommend     text,
  p_open_text           text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into event_surveys (
    event_id, participant_id, rating,
    increased_enjoyment, met_someone,
    would_recommend, open_text
  ) values (
    p_event_id, p_participant_id, p_rating,
    p_increased_enjoyment, p_met_someone,
    p_would_recommend, p_open_text
  );

  update participants set survey_submitted = true where id = p_participant_id;
end;
$$;

grant execute on function public.rpc_submit_survey(uuid, uuid, smallint, text, text, text, text) to anon, authenticated;

-- v2.10: upsert known_players; called by send-feedback-sms edge function (service role)
create or replace function public.rpc_increment_known_player(p_phone_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into known_players (phone_hash, event_count, first_seen, last_seen)
  values (p_phone_hash, 1, now(), now())
  on conflict (phone_hash) do update
  set event_count = known_players.event_count + 1,
      last_seen   = now();
end;
$$;
-- intentionally no anon/authenticated grant — service-role only.

-- v2.7: trigger body — on event activation, queue a reminder 15m before start
create or replace function public.schedule_sms_reminder()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active' and old.status != 'active' then
    insert into sms_reminders (event_id, send_at)
    values (new.id, new.start_time - interval '15 minutes');
  end if;
  return new;
end;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists on_event_activated on events;
create trigger on_event_activated
  after update on events
  for each row execute function schedule_sms_reminder();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table categories            enable row level security;
alter table missions              enable row level security;
alter table events                enable row level security;
alter table event_config          enable row level security;
alter table participants          enable row level security;
alter table participant_missions  enable row level security;
alter table feedback              enable row level security;
alter table completion_reactions  enable row level security;
alter table completion_comments   enable row level security;
alter table sms_reminders         enable row level security;   -- v3.1 (service-role only, no policies)
alter table event_surveys         enable row level security;
alter table known_players         enable row level security;   -- service-role only, no policies
alter table admin_emails          enable row level security;

-- ─── categories ────────────────────────────────────────────────
create policy "Categories are publicly readable"
  on categories for select using (true);

create policy "Admins can insert categories"
  on categories for insert with check (is_admin());

create policy "Admins can update categories"
  on categories for update using (is_admin());

create policy "Admins can delete categories"
  on categories for delete using (is_admin());

-- ─── missions ──────────────────────────────────────────────────
create policy "Missions are readable"
  on missions for select using (active = true or is_admin());

create policy "Admins can insert missions"
  on missions for insert with check (is_admin());

create policy "Admins can update missions"
  on missions for update using (is_admin());

create policy "Admins can delete missions"
  on missions for delete using (is_admin());

-- ─── events ────────────────────────────────────────────────────
create policy "Events are readable by anyone"
  on events for select using (true);

create policy "Organizers can insert their own events"
  on events for insert with check ((select auth.uid()) = organizer_id);

create policy "Organizers can update their own events"
  on events for update using ((select auth.uid()) = organizer_id);

create policy "Organizers can delete their own events"
  on events for delete using ((select auth.uid()) = organizer_id);

-- ─── event_config ──────────────────────────────────────────────
create policy "Event config is publicly readable"
  on event_config for select using (true);

create policy "Organizers can insert event config"
  on event_config for insert with check (
    exists (
      select 1 from events
      where events.id = event_config.event_id
        and events.organizer_id = (select auth.uid())
    )
  );

create policy "Organizers can update event config"
  on event_config for update using (
    exists (
      select 1 from events
      where events.id = event_config.event_id
        and events.organizer_id = (select auth.uid())
    )
  );

create policy "Organizers can delete event config"
  on event_config for delete using (
    exists (
      select 1 from events
      where events.id = event_config.event_id
        and events.organizer_id = (select auth.uid())
    )
  );

-- ─── participants ──────────────────────────────────────────────
create policy "Participants are publicly readable"
  on participants for select using (true);

create policy "Organizers can insert participants"
  on participants for insert with check (
    exists (
      select 1 from events
      where events.id = participants.event_id
        and events.organizer_id = (select auth.uid())
    )
  );

create policy "Organizers can update participants"
  on participants for update using (
    exists (
      select 1 from events
      where events.id = participants.event_id
        and events.organizer_id = (select auth.uid())
    )
  );

-- ─── participant_missions ──────────────────────────────────────
create policy "Participant missions are publicly readable"
  on participant_missions for select using (true);

create policy "Organizers can insert participant missions"
  on participant_missions for insert with check (
    exists (
      select 1 from participants
      join events on events.id = participants.event_id
      where participants.id = participant_missions.participant_id
        and events.organizer_id = (select auth.uid())
    )
  );

create policy "Organizers can update participant missions"
  on participant_missions for update using (
    exists (
      select 1 from participants
      join events on events.id = participants.event_id
      where participants.id = participant_missions.participant_id
        and events.organizer_id = (select auth.uid())
    )
  );

-- ─── feedback ──────────────────────────────────────────────────
create policy "Feedback is readable"
  on feedback for select using (true);

-- v3.2: require an active-event participant
create policy "feedback_insert_active_participant"
  on feedback for insert to anon, authenticated
  with check (public.is_active_participant(participant_id));

create policy "Admins can delete feedback"
  on feedback for delete using (is_admin());

-- ─── completion_reactions ──────────────────────────────────────
create policy "Completion reactions are publicly readable"
  on completion_reactions for select using (true);

-- v3.2: tightened — only active-event participants can insert;
-- DELETE intentionally has no policy (handled by rpc_remove_reaction)
create policy "completion_reactions_insert_active_participant"
  on completion_reactions for insert to anon, authenticated
  with check (public.is_active_participant(participant_id));

-- ─── completion_comments ───────────────────────────────────────
create policy "Completion comments are publicly readable"
  on completion_comments for select using (true);

-- v3.2: require an active-event participant
create policy "completion_comments_insert_active_participant"
  on completion_comments for insert to anon, authenticated
  with check (public.is_active_participant(participant_id));

-- ─── event_surveys ─────────────────────────────────────────────
create policy "Anyone can submit a survey"
  on event_surveys for insert with check (
    participant_id is not null
    and event_id is not null
    and exists (
      select 1 from participants p
      where p.id = event_surveys.participant_id
        and p.event_id = event_surveys.event_id
    )
  );

create policy "Admins or organizers can read event surveys"
  on event_surveys for select using (
    is_admin()
    or exists (
      select 1 from events
      where events.id = event_surveys.event_id
        and events.organizer_id = (select auth.uid())
    )
  );

-- ─── admin_emails ──────────────────────────────────────────────
create policy "Admins can read admin list"
  on admin_emails for select using (
    (select email from auth.users where id = (select auth.uid()))
      in (select email from admin_emails)
  );

-- sms_reminders + known_players: RLS on, NO policies.
-- With zero policies, only the service role (which bypasses RLS) can read/write.

-- ============================================================
-- v3.5: Admin-only RPC for organizer sign-in registry
-- ============================================================

create or replace function public.rpc_get_organizer_users()
returns table (
  id               uuid,
  email            text,
  full_name        text,
  avatar_url       text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email,
    (u.raw_user_meta_data->>'full_name')::text,
    (u.raw_user_meta_data->>'avatar_url')::text,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  order by u.created_at desc;
end;
$$;

grant execute on function public.rpc_get_organizer_users() to authenticated;

-- ============================================================
-- BOOTSTRAP REMINDERS
-- ============================================================
-- After running this file, insert at least one admin email so is_admin() works:
--   INSERT INTO admin_emails (email) VALUES ('you@example.com');
--
-- Store these Vault secrets for the pg_cron SMS reminder job:
--   SELECT vault.create_secret('https://<project>.supabase.co', 'project_url', 'Supabase project URL');
--   SELECT vault.create_secret('<SERVICE_ROLE_KEY>',            'service_role_key', 'Used by pg_cron');
--
-- Then schedule the reminder poller (runs every 5 min):
--   SELECT cron.schedule('sms-reminder-check', '*/5 * * * *', $cmd$
--     SELECT net.http_post(
--       url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
--              || '/functions/v1/send-event-sms-blast',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
--         'Content-Type',  'application/json'
--       ),
--       body := jsonb_build_object('eventId', event_id::text, 'scenario', 'reminder')
--     )
--     FROM sms_reminders
--     WHERE sent = false AND send_at <= now();
--   $cmd$);
