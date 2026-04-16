-- Party Quest v2.10 — Post-Event Feedback Survey
-- Adds event_surveys table, known_players table,
-- and new columns on events + participants.

-- ─── New columns ───────────────────────────────────────────────────────────────

ALTER TABLE events ADD COLUMN IF NOT EXISTS feedback_sent_at timestamptz;
-- Tracks when feedback SMS was sent — prevents duplicate blasts

ALTER TABLE participants ADD COLUMN IF NOT EXISTS survey_submitted boolean DEFAULT false;
-- Quick flag to avoid re-querying event_surveys for display

-- ─── New table: event_surveys ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_surveys (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id            uuid REFERENCES events(id) ON DELETE CASCADE,
  participant_id      uuid REFERENCES participants(id) ON DELETE SET NULL,
  rating              smallint CHECK (rating BETWEEN 1 AND 5),
  increased_enjoyment text CHECK (increased_enjoyment IN ('yes', 'somewhat', 'no')),
  met_someone         text CHECK (met_someone IN ('yes', 'kind_of', 'no')),
  would_recommend     text CHECK (would_recommend IN ('yes', 'no')),
  open_text           text,
  submitted_at        timestamptz DEFAULT now(),
  UNIQUE (participant_id)  -- one response per participant
);

ALTER TABLE event_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a survey"
  ON event_surveys FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read event surveys"
  ON event_surveys FOR SELECT
  USING (is_admin());

CREATE POLICY "Organizers can read surveys for their events"
  ON event_surveys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_surveys.event_id
        AND events.organizer_id = auth.uid()
    )
  );

-- ─── New table: known_players ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS known_players (
  phone_hash   text PRIMARY KEY,  -- SHA-256 of E.164 phone number
  event_count  integer DEFAULT 1,
  first_seen   timestamptz DEFAULT now(),
  last_seen    timestamptz DEFAULT now()
);

-- Service role only — edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- No public policies: with RLS enabled and no policies, only service role can access.
ALTER TABLE known_players ENABLE ROW LEVEL SECURITY;

-- ─── RPC: atomic survey submit ─────────────────────────────────────────────────
-- SECURITY DEFINER so anon callers don't need UPDATE on participants directly.

CREATE OR REPLACE FUNCTION rpc_submit_survey(
  p_participant_id      uuid,
  p_event_id            uuid,
  p_rating              smallint,
  p_increased_enjoyment text,
  p_met_someone         text,
  p_would_recommend     text,
  p_open_text           text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO event_surveys (
    event_id, participant_id, rating,
    increased_enjoyment, met_someone,
    would_recommend, open_text
  ) VALUES (
    p_event_id, p_participant_id, p_rating,
    p_increased_enjoyment, p_met_someone,
    p_would_recommend, p_open_text
  );

  UPDATE participants
  SET survey_submitted = true
  WHERE id = p_participant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_submit_survey(uuid, uuid, smallint, text, text, text, text) TO anon, authenticated;

-- ─── RPC: known_players upsert with increment ──────────────────────────────────
-- Called by the send-feedback-sms edge function (service role).

CREATE OR REPLACE FUNCTION rpc_increment_known_player(p_phone_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO known_players (phone_hash, event_count, first_seen, last_seen)
  VALUES (p_phone_hash, 1, now(), now())
  ON CONFLICT (phone_hash) DO UPDATE
  SET event_count = known_players.event_count + 1,
      last_seen   = now();
END;
$$;
-- No public GRANT needed — only called by service role in edge function.
