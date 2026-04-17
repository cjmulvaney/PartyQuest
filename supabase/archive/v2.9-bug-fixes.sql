-- Party Quest v2.9 — Bug Fixes for v2.7 / v2.8
-- Fixes: RPC function overload + missing GRANT, mission assignment RLS,
--        registration blocked for upcoming events, missing search_path

-- ============================================================
-- 1. Fix RPC overload: drop old 2-param version, keep 3-param
-- ============================================================

-- The v2.6 migration created rpc_register_participant(text, text).
-- The v2.7 migration added rpc_register_participant(text, text, text)
-- as a separate overload instead of replacing. Drop the old one.
DROP FUNCTION IF EXISTS rpc_register_participant(text, text);

-- ============================================================
-- 2. Replace rpc_register_participant with fixed version
--    - Adds SET search_path = public (security best practice)
--    - Allows both 'active' and 'upcoming' events
--    - GRANT to anon + authenticated
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_register_participant(
  p_event_code text,
  p_name text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
  v_code text;
  v_participant record;
  v_attempt int := 0;
  v_max_attempts int := 5;
  v_count int;
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.status = 'ended' THEN
    RAISE EXCEPTION 'This event has already ended';
  END IF;

  IF v_event.status NOT IN ('active', 'upcoming') THEN
    RAISE EXCEPTION 'Event is not open yet';
  END IF;

  -- Check max participants
  IF v_event.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM participants
    WHERE event_id = v_event.id AND is_active = true;

    IF v_count >= v_event.max_participants THEN
      RAISE EXCEPTION 'Event is full';
    END IF;
  END IF;

  -- Check duplicate name (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM participants
    WHERE event_id = v_event.id AND lower(trim(name)) = lower(v_trimmed_name) AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Name already taken';
  END IF;

  -- Generate unique access code with retry
  LOOP
    v_code := generate_access_code(6);
    BEGIN
      INSERT INTO participants (event_id, name, access_code, joined_at, source, is_active, phone)
      VALUES (v_event.id, v_trimmed_name, v_code, now(), 'self', true, p_phone)
      RETURNING * INTO v_participant;
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt >= v_max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique access code';
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_participant.id,
    'name', v_participant.name,
    'access_code', v_participant.access_code,
    'event_id', v_participant.event_id,
    'phone', v_participant.phone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_register_participant(text, text, text) TO anon, authenticated;

-- ============================================================
-- 3. New RPC: rpc_assign_participant_missions
--    Allows mission assignment to bypass RLS (which was tightened
--    in v2.6 to organizer-only INSERT on participant_missions).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_assign_participant_missions(
  p_participant_id uuid,
  p_mission_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify participant exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM participants WHERE id = p_participant_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Participant not found';
  END IF;

  -- Insert mission assignments
  INSERT INTO participant_missions (participant_id, mission_id)
  SELECT p_participant_id, unnest(p_mission_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_assign_participant_missions(uuid, uuid[]) TO anon, authenticated;
