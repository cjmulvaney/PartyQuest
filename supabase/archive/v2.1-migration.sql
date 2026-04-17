-- Party Quest V2.1 Migration
-- Run this in the Supabase SQL Editor to apply V2.1 schema changes.

-- 1. Remove draft status: update any existing drafts to 'upcoming'
UPDATE events SET status = 'upcoming' WHERE status = 'draft';

-- 2. Add feed_mode column to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS feed_mode text DEFAULT 'secret' CHECK (feed_mode IN ('secret', 'transparent'));

-- 3. Add max_participants column to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_participants integer;

-- 4. Add soft-delete, source, and phone to participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source IN ('manual', 'self'));
ALTER TABLE participants ADD COLUMN IF NOT EXISTS phone text;

-- 5. Add creator_name to missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS creator_name text;

-- 6. Add delete policy for events
CREATE POLICY IF NOT EXISTS "Organizers can delete their own events"
  ON events FOR DELETE
  USING (auth.uid() = organizer_id);

-- 7. Add delete policy for event_config
CREATE POLICY IF NOT EXISTS "Organizers can delete event config"
  ON event_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_config.event_id AND events.organizer_id = auth.uid()
    )
  );
