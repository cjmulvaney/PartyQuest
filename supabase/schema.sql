-- Party Quest V2 — Database Schema
-- Run this in the Supabase SQL Editor to set up all tables and RLS policies.

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Categories for missions
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Mission library
create table missions (
  id uuid primary key default uuid_generate_v4(),
  text text not null,
  category_id uuid references categories(id) on delete set null,
  tags text[] default '{}',
  active boolean default true,
  -- V2.1: who created this mission
  creator_name text,
  created_at timestamptz default now()
);

-- Events
create table events (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid references auth.users(id) on delete cascade,
  name text not null,
  event_type text check (event_type in ('birthday', 'house party', 'bachelorette', 'work offsite', 'weekend trip', 'other')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  event_code text unique not null,
  anonymity_enabled boolean default false,
  how_heard text,
  email_opt_in boolean default false,
  organizer_email text,
  status text default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  -- V2.1: feed_mode controls activity feed visibility ('secret' = hide mission text, 'transparent' = show mission text)
  feed_mode text default 'secret' check (feed_mode in ('secret', 'transparent')),
  -- V2.2: toggle whether photos are shown in the activity feed
  feed_photos_enabled boolean default true,
  -- V2.2: toggle whether comments/notes are shown in the activity feed
  feed_comments_enabled boolean default true,
  -- V2.3: toggle whether emoji reactions are enabled on feed completions
  feed_reactions_enabled boolean default true,
  -- V2.3: toggle whether interactive comments are enabled on feed completions
  feed_interactive_comments_enabled boolean default false,
  -- V2.1: max participant count for self-registration (NULL = unlimited)
  max_participants integer,
  created_at timestamptz default now()
);

-- Event configuration
create table event_config (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade unique,
  mission_count integer default 3 check (mission_count between 1 and 5),
  unlock_type text default 'all_at_once' check (unlock_type in ('all_at_once', 'timed')),
  unlock_schedule jsonb default '[]',
  tag_filters text[] default '{}'
);

-- Participants
create table participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  name text not null,
  access_code text unique not null,
  joined_at timestamptz,
  -- V2.1: soft-delete support
  is_active boolean default true,
  -- V2.1: 'manual' = organizer-added, 'self' = self-registered via invite link
  source text default 'manual' check (source in ('manual', 'self')),
  -- V2.1: phone number (optional, collected during self-registration)
  phone text
);

-- Participant missions (assigned missions per participant)
create table participant_missions (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid references participants(id) on delete cascade,
  mission_id uuid references missions(id) on delete cascade,
  completed boolean default false,
  notes text,
  photo_url text,
  completed_at timestamptz,
  unlock_time timestamptz
);

-- Feedback
create table feedback (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete set null,
  participant_id uuid references participants(id) on delete set null,
  text text not null,
  created_at timestamptz default now()
);

-- V2.3: Emoji reactions on completion feed entries
create table completion_reactions (
  id uuid primary key default uuid_generate_v4(),
  participant_mission_id uuid references participant_missions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(participant_mission_id, participant_id, emoji)
);

-- V2.3: Interactive comments on completion feed entries
create table completion_comments (
  id uuid primary key default uuid_generate_v4(),
  participant_mission_id uuid references participant_missions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_missions_category on missions(category_id);
create index idx_missions_active on missions(active);
create index idx_events_organizer on events(organizer_id);
create index idx_events_code on events(event_code);
create index idx_events_status on events(status);
create index idx_participants_event on participants(event_id);
create index idx_participants_access_code on participants(access_code);
create index idx_participant_missions_participant on participant_missions(participant_id);
create index idx_participant_missions_mission on participant_missions(mission_id);
create index idx_feedback_event on feedback(event_id);
create index idx_completion_reactions_pm on completion_reactions(participant_mission_id);
create index idx_completion_reactions_participant on completion_reactions(participant_id);
create index idx_completion_comments_pm on completion_comments(participant_mission_id);
create index idx_completion_comments_participant on completion_comments(participant_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table categories enable row level security;
alter table missions enable row level security;
alter table events enable row level security;
alter table event_config enable row level security;
alter table participants enable row level security;
alter table participant_missions enable row level security;
alter table feedback enable row level security;
alter table completion_reactions enable row level security;
alter table completion_comments enable row level security;

-- Categories: readable by everyone
create policy "Categories are publicly readable"
  on categories for select
  using (true);

-- Missions: readable by everyone (active only for non-admins, but keeping simple for Phase 1)
create policy "Active missions are publicly readable"
  on missions for select
  using (active = true);

-- Events: readable by participants via event_code, writable by organizer
create policy "Events are readable by anyone"
  on events for select
  using (true);

create policy "Organizers can insert their own events"
  on events for insert
  with check (auth.uid() = organizer_id);

create policy "Organizers can update their own events"
  on events for update
  using (auth.uid() = organizer_id);

-- V2.1: Organizers can delete their own events
create policy "Organizers can delete their own events"
  on events for delete
  using (auth.uid() = organizer_id);

-- Event config: readable by anyone, writable by organizer
create policy "Event config is publicly readable"
  on event_config for select
  using (true);

create policy "Organizers can insert event config"
  on event_config for insert
  with check (
    exists (
      select 1 from events where events.id = event_config.event_id and events.organizer_id = auth.uid()
    )
  );

create policy "Organizers can update event config"
  on event_config for update
  using (
    exists (
      select 1 from events where events.id = event_config.event_id and events.organizer_id = auth.uid()
    )
  );

-- V2.1: Organizers can delete event config (cascades from event delete)
create policy "Organizers can delete event config"
  on event_config for delete
  using (
    exists (
      select 1 from events where events.id = event_config.event_id and events.organizer_id = auth.uid()
    )
  );

-- Participants: readable by anyone in the event, insertable for joining
create policy "Participants are publicly readable"
  on participants for select
  using (true);

create policy "Anyone can join as participant"
  on participants for insert
  with check (true);

create policy "Participants can update their own record"
  on participants for update
  using (true);

-- Participant missions: readable by participant, updatable by participant
create policy "Participant missions are publicly readable"
  on participant_missions for select
  using (true);

create policy "Participant missions can be inserted"
  on participant_missions for insert
  with check (true);

create policy "Participant missions can be updated"
  on participant_missions for update
  using (true);

-- Feedback: insertable by anyone, readable by admins (keeping open for Phase 1)
create policy "Anyone can submit feedback"
  on feedback for insert
  with check (true);

create policy "Feedback is readable"
  on feedback for select
  using (true);

-- V2.3: Completion reactions: publicly readable/writable
create policy "Completion reactions are publicly readable"
  on completion_reactions for select
  using (true);

create policy "Anyone can add reactions"
  on completion_reactions for insert
  with check (true);

create policy "Anyone can remove their reactions"
  on completion_reactions for delete
  using (true);

-- V2.3: Completion comments: publicly readable/writable
create policy "Completion comments are publicly readable"
  on completion_comments for select
  using (true);

create policy "Anyone can add completion comments"
  on completion_comments for insert
  with check (true);
