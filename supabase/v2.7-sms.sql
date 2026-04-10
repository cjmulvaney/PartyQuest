-- v2.7 SMS Feature Migration
-- Adds phone/SMS support for participant notifications via Twilio

-- 1. Add sms_sent_at column to participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz;

-- 2. Update rpc_register_participant to accept phone
CREATE OR REPLACE FUNCTION rpc_register_participant(
  p_event_code text,
  p_name text,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event record;
  v_code text;
  v_participant record;
  v_attempt int := 0;
  v_max_attempts int := 5;
  v_count int;
BEGIN
  -- Look up event
  SELECT id, name, status, max_participants
  INTO v_event
  FROM events
  WHERE event_code = upper(trim(p_event_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.status != 'active' THEN
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

  -- Check duplicate name
  IF EXISTS (
    SELECT 1 FROM participants
    WHERE event_id = v_event.id AND lower(trim(name)) = lower(trim(p_name)) AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Name already taken';
  END IF;

  -- Generate unique access code with retry
  LOOP
    v_code := generate_access_code(6);
    BEGIN
      INSERT INTO participants (event_id, name, access_code, source, phone)
      VALUES (v_event.id, trim(p_name), v_code, 'self', p_phone)
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

-- 3. Create sms_reminders table
CREATE TABLE IF NOT EXISTS sms_reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  send_at timestamptz NOT NULL,
  sent boolean DEFAULT false
);

-- 4. Trigger: schedule SMS reminder when event is activated
CREATE OR REPLACE FUNCTION schedule_sms_reminder()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    INSERT INTO sms_reminders (event_id, send_at)
    VALUES (NEW.id, NEW.start_time - INTERVAL '15 minutes');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_event_activated ON events;
CREATE TRIGGER on_event_activated
AFTER UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION schedule_sms_reminder();

-- 5. pg_cron job (run manually after enabling pg_net extension)
-- SELECT cron.schedule('sms-reminder-check', '*/5 * * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/send-event-sms-blast',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := jsonb_build_object('scenario', 'reminder')
--   )
--   FROM sms_reminders
--   WHERE sent = false AND send_at <= now();
-- $$);
