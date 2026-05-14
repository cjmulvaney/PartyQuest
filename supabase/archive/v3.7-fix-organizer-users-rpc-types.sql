-- v3.7 — Fix rpc_get_organizer_users() type mismatch.
-- Status: PENDING — run in Supabase SQL editor on prod (ynffsjqnwhvyzrerbxor).
--
-- Why: auth.users.email is character varying(255) in Supabase, not text.
-- CREATE OR REPLACE cannot change return types, so we drop first, then
-- recreate with explicit ::text casts on all varchar columns to satisfy
-- the RETURNS TABLE type contract.

DROP FUNCTION IF EXISTS public.rpc_get_organizer_users();

CREATE FUNCTION public.rpc_get_organizer_users()
RETURNS TABLE (
  id               uuid,
  email            text,
  full_name        text,
  avatar_url       text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id::uuid,
    u.email::text,
    (u.raw_user_meta_data->>'full_name')::text,
    (u.raw_user_meta_data->>'avatar_url')::text,
    u.created_at::timestamptz,
    u.last_sign_in_at::timestamptz
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_get_organizer_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_organizer_users() FROM anon;
GRANT  EXECUTE ON FUNCTION public.rpc_get_organizer_users() TO authenticated;
