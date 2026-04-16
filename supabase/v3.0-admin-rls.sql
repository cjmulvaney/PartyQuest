-- Party Quest v3.0 — Admin RLS & Permissions
-- Adds secure admin access control for categories, missions, and feedback moderation.
-- Uses a SECURITY DEFINER helper function (is_admin) that checks the caller's JWT email
-- against an admin_emails table — Option B approach for database-level enforcement.
--
-- IMPORTANT: After running this migration, insert your admin email:
--   INSERT INTO admin_emails (email) VALUES ('your-admin@example.com');

-- ============================================================
-- 1. Admin email registry table
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- RLS: only admins can read/modify the admin list (bootstrap via service role)
ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin list"
  ON admin_emails FOR SELECT
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (SELECT email FROM admin_emails)
  );

-- ============================================================
-- 2. SECURITY DEFINER helper: is_admin()
-- Returns true if the current JWT bearer's email is in admin_emails.
-- STABLE + SECURITY DEFINER so it can read admin_emails regardless of RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_emails
    WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================================
-- 3. Fix missions SELECT policy — admin can see ALL missions (including inactive)
-- ============================================================

DROP POLICY IF EXISTS "Active missions are publicly readable" ON missions;

CREATE POLICY "Missions are readable"
  ON missions FOR SELECT
  USING (active = true OR is_admin());

-- ============================================================
-- 4. Add INSERT / UPDATE / DELETE policies for missions
-- ============================================================

CREATE POLICY "Admins can insert missions"
  ON missions FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update missions"
  ON missions FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete missions"
  ON missions FOR DELETE
  USING (is_admin());

-- ============================================================
-- 5. Add INSERT / UPDATE / DELETE policies for categories
-- ============================================================

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (is_admin());

-- ============================================================
-- 6. Add DELETE policy for feedback (moderation)
-- ============================================================

CREATE POLICY "Admins can delete feedback"
  ON feedback FOR DELETE
  USING (is_admin());
