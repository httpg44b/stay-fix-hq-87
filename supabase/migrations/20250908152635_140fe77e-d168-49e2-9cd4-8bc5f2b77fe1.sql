-- Restrict users table emails visibility
-- 1) Remove overly-broad SELECT policy
DROP POLICY IF EXISTS users_authenticated_select ON public.users;

-- 2) Allow users to select ONLY their own profile
CREATE POLICY users_self_select
ON public.users
FOR SELECT
USING (id = auth.uid()::text);

-- 3) Ensure admins retain full access via is_admin()
DROP POLICY IF EXISTS users_admin_full_access ON public.users;
CREATE POLICY users_admin_full_access
ON public.users
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());