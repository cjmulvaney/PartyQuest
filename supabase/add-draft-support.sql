-- Add draft support to events table
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS draft_data jsonb DEFAULT NULL;

-- Allow 'draft' as a status value (update check constraint if one exists)
-- The status column is text, so 'draft' should work without changes.
-- Make event_code nullable for drafts
ALTER TABLE events 
  ALTER COLUMN event_code DROP NOT NULL;
