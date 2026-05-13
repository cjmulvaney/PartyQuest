-- v3.6 — Lock down rpc_get_organizer_users() from anonymous access.
-- Status: APPLIED 2026-05-13 to prod (ynffsjqnwhvyzrerbxor).
--
-- Why: Supabase advisor flagged the function as anon-executable. It already
-- checks is_admin() server-side so the real risk is only enumeration of an
-- admin endpoint over PostgREST. This revokes the grant cleanly.
--
-- Notes:
--   * Function was originally created with the default GRANT EXECUTE TO PUBLIC,
--     so anon inherited execute via PUBLIC. We revoke PUBLIC and re-grant only
--     to `authenticated`.

REVOKE EXECUTE ON FUNCTION public.rpc_get_organizer_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_organizer_users() FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_get_organizer_users() TO authenticated;
