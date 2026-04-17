-- Party Quest v2.6 — Database Migration
-- Addresses: RLS tightening (#1), atomic registration (#3, #9), access code retry (#7),
-- join flow (#11), mission completion security, and duplicate name prevention.
--
-- IMPORTANT: Run this migration BEFORE deploying the v2.6 frontend.

-- ============================================================
-- 1A: Helper function — generate_access_code(length)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_access_code(code_length integer DEFAULT 6)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..code_length LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================================
-- 1B: RPC — rpc_register_participant(p_event_code, p_name)
-- Solves: #1 (RLS bypass), #3 (atomic max check), #7 (code retry), #9 (duplicate name)
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_register_participant(p_event_code text, p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
  v_count integer;
  v_access_code text;
  v_participant record;
  v_attempts integer := 0;
  v_trimmed_name text;
BEGIN
  v_trimmed_name := trim(p_name);

  IF v_trimmed_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  -- Look up event
  SELECT id, name, status, max_participants
    INTO v_event
    FROM events
    WHERE event_code = upper(trim(p_event_code));

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.status = 'ended' THEN
    RAISE EXCEPTION 'This event has already ended';
  END IF;

  IF v_event.status != 'active' THEN
    RAISE EXCEPTION 'This event is not open yet';
  END IF;

  -- Duplicate name check (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM participants
    WHERE event_id = v_event.id
      AND lower(trim(name)) = lower(v_trimmed_name)
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Name already taken';
  END IF;

  -- Atomic max participants check
  IF v_event.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_count
      FROM participants
      WHERE event_id = v_event.id AND is_active = true;

    IF v_count >= v_event.max_participants THEN
      RAISE EXCEPTION 'Event is full';
    END IF;
  END IF;

  -- Generate access code with retry on collision
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 5 THEN
      RAISE EXCEPTION 'Failed to generate unique access code';
    END IF;

    v_access_code := generate_access_code(6);

    BEGIN
      INSERT INTO participants (event_id, name, access_code, joined_at, source, is_active)
      VALUES (v_event.id, v_trimmed_name, v_access_code, now(), 'self', true)
      RETURNING * INTO v_participant;

      -- Success
      RETURN jsonb_build_object(
        'id', v_participant.id,
        'event_id', v_participant.event_id,
        'name', v_participant.name,
        'access_code', v_participant.access_code,
        'joined_at', v_participant.joined_at,
        'source', v_participant.source
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Access code collision — retry
        CONTINUE;
    END;
  END LOOP;
END;
$$;

-- ============================================================
-- 1C: RPC — rpc_join_event(p_event_code, p_access_code)
-- Solves: #11 (joined_at error handling)
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_join_event(p_event_code text, p_access_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
  v_participant record;
BEGIN
  -- Look up event
  SELECT id, name, status
    INTO v_event
    FROM events
    WHERE event_code = upper(trim(p_event_code));

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.status = 'ended' THEN
    RAISE EXCEPTION 'This event has already ended';
  END IF;

  IF v_event.status != 'active' THEN
    RAISE EXCEPTION 'This event is not open yet';
  END IF;

  -- Look up participant
  SELECT * INTO v_participant
    FROM participants
    WHERE event_id = v_event.id
      AND access_code = upper(trim(p_access_code))
      AND is_active = true;

  IF v_participant IS NULL THEN
    RAISE EXCEPTION 'Access code not found for this event';
  END IF;

  -- Set joined_at if not already set
  IF v_participant.joined_at IS NULL THEN
    UPDATE participants
      SET joined_at = now()
      WHERE id = v_participant.id;
    v_participant.joined_at := now();
  END IF;

  RETURN jsonb_build_object(
    'id', v_participant.id,
    'name', v_participant.name,
    'access_code', v_participant.access_code,
    'joined_at', v_participant.joined_at,
    'event_id', v_participant.event_id
  );
END;
$$;

-- ============================================================
-- 1D: RPC — rpc_complete_mission(p_access_code, p_mission_id, p_notes, p_photo_url)
-- Secures mission completion (issue #1)
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_complete_mission(
  p_access_code text,
  p_mission_id uuid,
  p_notes text DEFAULT NULL,
  p_photo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant record;
  v_pm record;
BEGIN
  -- Look up participant by access code
  SELECT * INTO v_participant
    FROM participants
    WHERE access_code = upper(trim(p_access_code))
      AND is_active = true;

  IF v_participant IS NULL THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  -- Verify the mission belongs to this participant
  SELECT * INTO v_pm
    FROM participant_missions
    WHERE participant_id = v_participant.id
      AND mission_id = p_mission_id;

  IF v_pm IS NULL THEN
    RAISE EXCEPTION 'Mission not assigned to this participant';
  END IF;

  -- Update the mission
  UPDATE participant_missions
    SET completed = true,
        notes = COALESCE(p_notes, notes),
        photo_url = COALESCE(p_photo_url, photo_url),
        completed_at = now()
    WHERE id = v_pm.id;

  RETURN jsonb_build_object(
    'id', v_pm.id,
    'completed', true,
    'completed_at', now()
  );
END;
$$;

-- ============================================================
-- 1E: Tighten RLS policies on participants and participant_missions
-- ============================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can join as participant" ON participants;
DROP POLICY IF EXISTS "Participants can update their own record" ON participants;
DROP POLICY IF EXISTS "Participant missions can be inserted" ON participant_missions;
DROP POLICY IF EXISTS "Participant missions can be updated" ON participant_missions;

-- Organizers can insert participants for their own events
CREATE POLICY "Organizers can insert participants"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
        AND events.organizer_id = auth.uid()
    )
  );

-- Organizers can update participants in their own events
CREATE POLICY "Organizers can update participants"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
        AND events.organizer_id = auth.uid()
    )
  );

-- Organizers can insert mission assignments for their events
CREATE POLICY "Organizers can insert participant missions"
  ON participant_missions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      JOIN events ON events.id = participants.event_id
      WHERE participants.id = participant_missions.participant_id
        AND events.organizer_id = auth.uid()
    )
  );

-- Organizers can update mission assignments for their events
CREATE POLICY "Organizers can update participant missions"
  ON participant_missions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      JOIN events ON events.id = participants.event_id
      WHERE participants.id = participant_missions.participant_id
        AND events.organizer_id = auth.uid()
    )
  );

-- SELECT policies remain as-is (publicly readable for leaderboard/feed)

-- ============================================================
-- 1F: Partial unique index for names (issue #9)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_name_per_event
  ON participants (event_id, lower(trim(name)))
  WHERE is_active = true;

-- ============================================================
-- Grant execute on RPC functions to anon and authenticated roles
-- ============================================================

GRANT EXECUTE ON FUNCTION rpc_register_participant(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_join_event(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_complete_mission(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_access_code(integer) TO anon, authenticated;
