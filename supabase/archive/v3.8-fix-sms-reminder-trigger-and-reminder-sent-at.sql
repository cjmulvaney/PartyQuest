-- v3.8: Fix 15-minute pre-event reminder
--
-- Bugs fixed:
-- 1. Trigger fired on status → 'active', but the app never sets status to 'active'.
--    Changed to fire on INSERT and on UPDATE OF start_time instead.
-- 2. send-event-sms-blast used sms_sent_at to gate reminders, which skipped
--    self-registered participants who already had sms_sent_at set from their
--    registration confirmation. Added reminder_sent_at as a separate idempotency field.

-- Add reminder_sent_at to participants
ALTER TABLE participants ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- Replace trigger function
CREATE OR REPLACE FUNCTION public.schedule_sms_reminder()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.start_time IS NOT NULL THEN
      INSERT INTO sms_reminders (event_id, send_at)
      VALUES (NEW.id, NEW.start_time - INTERVAL '15 minutes');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.start_time IS DISTINCT FROM OLD.start_time AND NEW.start_time IS NOT NULL THEN
      DELETE FROM sms_reminders WHERE event_id = NEW.id AND sent = false;
      INSERT INTO sms_reminders (event_id, send_at)
      VALUES (NEW.id, NEW.start_time - INTERVAL '15 minutes');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Replace trigger
DROP TRIGGER IF EXISTS on_event_activated ON events;
CREATE TRIGGER on_event_scheduled
  AFTER INSERT OR UPDATE OF start_time ON events
  FOR EACH ROW EXECUTE FUNCTION schedule_sms_reminder();

-- Backfill reminders for upcoming events with no existing unsent reminder
INSERT INTO sms_reminders (event_id, send_at)
SELECT id, start_time - INTERVAL '15 minutes'
FROM events
WHERE status = 'upcoming'
  AND start_time IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sms_reminders WHERE event_id = events.id AND sent = false
  );
