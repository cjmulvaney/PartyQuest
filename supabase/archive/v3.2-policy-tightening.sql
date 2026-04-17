-- =========================================================================
-- v3.2 — Policy tightening for feed interactions + feedback
-- =========================================================================
-- Status: DRAFTED, NOT APPLIED. Review carefully before running.
--
-- Goal: close the "any anon client can insert any participant_id" hole on
--       completion_reactions, completion_comments, and feedback, and
--       replace the always-true DELETE policy on completion_reactions with
--       a SECURITY DEFINER RPC that verifies ownership via access_code.
--
-- Rationale: v3.1 left these INSERT policies as `USING (true)` /
--            `WITH CHECK (true)` because the client is anon (no auth.uid).
--            The claim of identity comes from `participant_id` sent by the
--            browser — which means anyone who knows a participant's UUID
--            can impersonate them. We tighten by requiring the referenced
--            participant to exist and belong to an event that's currently
--            `active` (i.e. the participant is "live" in a running game).
--            This doesn't prove identity cryptographically, but it limits
--            writes to participants in live events and blocks stale/drive-by
--            forging against completed or draft events.
--
-- For DELETE on completion_reactions, we move to an RPC that requires the
-- caller to supply the participant's `access_code` — the same shared secret
-- they already use to join and act. That IS proof of identity.
--
-- Client changes required AFTER applying this migration:
--   - MissionCard.jsx (and any other feed component that removes a reaction):
--       Replace direct `.from('completion_reactions').delete()` with
--       `.rpc('rpc_remove_reaction', { p_participant_id, p_reaction_id, p_access_code })`.
--       The access_code is already in localStorage from join flow.
--   - No change needed for INSERT paths — the tightened policy still
--     admits inserts that name a real active-event participant, which the
--     client already does.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. Helper: does this participant_id belong to an active event?
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_participant(p_participant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM participants p
    JOIN events e ON e.id = p.event_id
    WHERE p.id = p_participant_id
      AND e.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_active_participant(uuid) IS
  'Returns true iff participant exists and belongs to an event with status=active. Used by tightened INSERT policies.';

-- -------------------------------------------------------------------------
-- 2. completion_reactions — tighten INSERT, replace permissive DELETE
-- -------------------------------------------------------------------------

-- Drop old permissive policies (names must match what v3.1 left behind;
-- adjust if your policy names differ).
DROP POLICY IF EXISTS "anyone can insert completion_reactions" ON public.completion_reactions;
DROP POLICY IF EXISTS "completion_reactions_insert" ON public.completion_reactions;
DROP POLICY IF EXISTS "anyone can delete completion_reactions" ON public.completion_reactions;
DROP POLICY IF EXISTS "completion_reactions_delete" ON public.completion_reactions;

-- New INSERT: participant_id must belong to an active event.
CREATE POLICY "completion_reactions_insert_active_participant"
ON public.completion_reactions
FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_active_participant(participant_id));

-- New DELETE: only the RPC (which runs as definer) may delete.
-- Block everyone from DELETE via table policy — force the path through RPC.
-- (No DELETE policy = no deletes from clients; RPC runs with elevated rights.)

-- -------------------------------------------------------------------------
-- 3. completion_comments — tighten INSERT
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone can insert completion_comments" ON public.completion_comments;
DROP POLICY IF EXISTS "completion_comments_insert" ON public.completion_comments;

CREATE POLICY "completion_comments_insert_active_participant"
ON public.completion_comments
FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_active_participant(participant_id));

-- -------------------------------------------------------------------------
-- 4. feedback — tighten INSERT
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "feedback_insert" ON public.feedback;

CREATE POLICY "feedback_insert_active_participant"
ON public.feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_active_participant(participant_id));

-- -------------------------------------------------------------------------
-- 5. rpc_remove_reaction — access-code-gated reaction removal
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_remove_reaction(
  p_participant_id uuid,
  p_reaction_id    uuid,
  p_access_code    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  -- Verify the caller knows this participant's access_code AND that the
  -- reaction actually belongs to that participant.
  SELECT EXISTS (
    SELECT 1
    FROM participants p
    JOIN completion_reactions r ON r.participant_id = p.id
    WHERE p.id = p_participant_id
      AND p.access_code = p_access_code
      AND r.id = p_reaction_id
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Not authorized to remove this reaction'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM completion_reactions
  WHERE id = p_reaction_id
    AND participant_id = p_participant_id;
END;
$$;

COMMENT ON FUNCTION public.rpc_remove_reaction(uuid, uuid, text) IS
  'Remove a reaction. Requires the participant''s access_code as proof of identity. SECURITY DEFINER bypasses RLS.';

GRANT EXECUTE ON FUNCTION public.rpc_remove_reaction(uuid, uuid, text) TO anon, authenticated;

COMMIT;

-- =========================================================================
-- Rollback (save outside this file if you want a one-shot undo):
-- BEGIN;
--   DROP POLICY IF EXISTS "completion_reactions_insert_active_participant" ON public.completion_reactions;
--   DROP POLICY IF EXISTS "completion_comments_insert_active_participant" ON public.completion_comments;
--   DROP POLICY IF EXISTS "feedback_insert_active_participant"            ON public.feedback;
--   DROP FUNCTION IF EXISTS public.rpc_remove_reaction(uuid, uuid, text);
--   DROP FUNCTION IF EXISTS public.is_active_participant(uuid);
--   -- Then recreate the old permissive policies if needed.
-- COMMIT;
-- =========================================================================
