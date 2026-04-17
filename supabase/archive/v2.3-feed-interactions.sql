-- V2.3: Feed Interactions — Emoji Reactions & Interactive Comments
-- Run this migration on existing databases to add feed interaction support.

-- 1. Add new toggle columns to events table
alter table events add column if not exists feed_reactions_enabled boolean default true;
alter table events add column if not exists feed_interactive_comments_enabled boolean default false;

-- 2. Create completion_reactions table
create table if not exists completion_reactions (
  id uuid primary key default uuid_generate_v4(),
  participant_mission_id uuid references participant_missions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(participant_mission_id, participant_id, emoji)
);

-- 3. Create completion_comments table
create table if not exists completion_comments (
  id uuid primary key default uuid_generate_v4(),
  participant_mission_id uuid references participant_missions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

-- 4. Indexes
create index if not exists idx_completion_reactions_pm on completion_reactions(participant_mission_id);
create index if not exists idx_completion_reactions_participant on completion_reactions(participant_id);
create index if not exists idx_completion_comments_pm on completion_comments(participant_mission_id);
create index if not exists idx_completion_comments_participant on completion_comments(participant_id);

-- 5. Row Level Security
alter table completion_reactions enable row level security;
alter table completion_comments enable row level security;

create policy "Completion reactions are publicly readable"
  on completion_reactions for select using (true);

create policy "Anyone can add reactions"
  on completion_reactions for insert with check (true);

create policy "Anyone can remove their reactions"
  on completion_reactions for delete using (true);

create policy "Completion comments are publicly readable"
  on completion_comments for select using (true);

create policy "Anyone can add completion comments"
  on completion_comments for insert with check (true);

-- 6. Enable realtime for new tables
alter publication supabase_realtime add table completion_reactions;
alter publication supabase_realtime add table completion_comments;
