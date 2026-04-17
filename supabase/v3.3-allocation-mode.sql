-- =========================================================================
-- v3.3 — Mission allocation mode (balanced vs. random)
-- =========================================================================
-- Status: DRAFTED, NOT APPLIED.
--
-- Adds an `allocation_mode` column to `event_config` so organizers can
-- choose how missions are dealt at event start:
--
--   • 'balanced' (default) — round-robin by category so each participant
--     gets a spread across mission categories before any duplicates.
--     Falls back to "best available" when a clean spread isn't possible.
--   • 'random' — preserves the prior behavior (leveled round-robin by
--     global assignment count, no per-participant category balancing).
--
-- Late joiners (self-register / QR / link after start) always use a
-- best-effort version of the chosen mode against whatever's left in the
-- pool. With ~10 missions per category and a 5-mission party-pack, this
-- keeps surprise duplicates rare.
-- =========================================================================

alter table event_config
  add column if not exists allocation_mode text
    default 'balanced'
    check (allocation_mode in ('balanced','random'));

-- Backfill any pre-existing rows that came in null (defensive — the
-- default takes care of new rows).
update event_config
   set allocation_mode = 'balanced'
 where allocation_mode is null;
