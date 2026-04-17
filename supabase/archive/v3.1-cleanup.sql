-- Party Quest v3.1 — Security & Performance Cleanup
-- Addresses advisor findings from post-v3.0 review.
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).

-- ============================================================
-- 1. Enable RLS on sms_reminders (ERROR: rls_disabled_in_public)
--    Only service-role traffic hits this table, so no policies needed.
--    With RLS on and zero policies, PostgREST clients see nothing.
-- ============================================================

ALTER TABLE sms_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Lock search_path on SECURITY DEFINER / trigger functions
--    (WARN: function_search_path_mutable)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_access_code(code_length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i      integer;
BEGIN
  FOR i IN 1..code_length LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_sms_reminder()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    INSERT INTO sms_reminders (event_id, send_at)
    VALUES (NEW.id, NEW.start_time - INTERVAL '15 minutes');
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Tighten event_surveys INSERT policy
--    (WARN: rls_policy_always_true on "Anyone can submit a survey")
--    Prevents anon from inserting rows with NULL identifiers.
--    The rpc_submit_survey RPC is the preferred path; this just
--    blocks obviously-bogus direct inserts.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can submit a survey" ON event_surveys;

CREATE POLICY "Anyone can submit a survey"
  ON event_surveys FOR INSERT
  WITH CHECK (
    participant_id IS NOT NULL
    AND event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.id = event_surveys.participant_id
        AND p.event_id = event_surveys.event_id
    )
  );

-- ============================================================
-- 4. Consolidate duplicate SELECT policies on event_surveys
--    (WARN: multiple_permissive_policies — admin + organizer)
-- ============================================================

DROP POLICY IF EXISTS "Admins can read event surveys" ON event_surveys;
DROP POLICY IF EXISTS "Organizers can read surveys for their events" ON event_surveys;

CREATE POLICY "Admins or organizers can read event surveys"
  ON event_surveys FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_surveys.event_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 5. Fix auth_rls_initplan re-evaluation warnings.
--    Wrap auth.uid() in (SELECT auth.uid()) so Postgres evaluates
--    it once per query instead of once per row.
-- ============================================================

-- events
DROP POLICY IF EXISTS "Organizers can insert their own events" ON events;
CREATE POLICY "Organizers can insert their own events"
  ON events FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can update their own events" ON events;
CREATE POLICY "Organizers can update their own events"
  ON events FOR UPDATE
  USING ((SELECT auth.uid()) = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete their own events" ON events;
CREATE POLICY "Organizers can delete their own events"
  ON events FOR DELETE
  USING ((SELECT auth.uid()) = organizer_id);

-- event_config
DROP POLICY IF EXISTS "Organizers can insert event config" ON event_config;
CREATE POLICY "Organizers can insert event config"
  ON event_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_config.event_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizers can update event config" ON event_config;
CREATE POLICY "Organizers can update event config"
  ON event_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_config.event_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizers can delete event config" ON event_config;
CREATE POLICY "Organizers can delete event config"
  ON event_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_config.event_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

-- participants
DROP POLICY IF EXISTS "Organizers can insert participants" ON participants;
CREATE POLICY "Organizers can insert participants"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizers can update participants" ON participants;
CREATE POLICY "Organizers can update participants"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

-- participant_missions
DROP POLICY IF EXISTS "Organizers can insert participant missions" ON participant_missions;
CREATE POLICY "Organizers can insert participant missions"
  ON participant_missions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      JOIN events ON events.id = participants.event_id
      WHERE participants.id = participant_missions.participant_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organizers can update participant missions" ON participant_missions;
CREATE POLICY "Organizers can update participant missions"
  ON participant_missions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      JOIN events ON events.id = participants.event_id
      WHERE participants.id = participant_missions.participant_id
        AND events.organizer_id = (SELECT auth.uid())
    )
  );

-- admin_emails
DROP POLICY IF EXISTS "Admins can read admin list" ON admin_emails;
CREATE POLICY "Admins can read admin list"
  ON admin_emails FOR SELECT
  USING (
    (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
      IN (SELECT email FROM admin_emails)
  );

-- ============================================================
-- 6. Missing indexes on foreign keys (INFO: unindexed_foreign_keys)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_event_surveys_event_id ON event_surveys(event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_participant_id ON feedback(participant_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_event_id ON sms_reminders(event_id);

-- Helpful for the cron / polling query that looks for due reminders
CREATE INDEX IF NOT EXISTS idx_sms_reminders_due
  ON sms_reminders(send_at)
  WHERE sent = false;

-- ============================================================
-- 7. Drop unused index (INFO: unused_index)
-- ============================================================

DROP INDEX IF EXISTS idx_missions_active;
