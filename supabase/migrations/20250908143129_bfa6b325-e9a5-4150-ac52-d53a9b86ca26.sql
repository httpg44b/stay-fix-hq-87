-- Fix RLS policies to allow first admin creation
-- Drop existing policies
DROP POLICY IF EXISTS "users_admin_full_access" ON public.users;
DROP POLICY IF EXISTS "users_self_select" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_read_all" ON public.users;

-- Create new policies that handle first admin creation

-- 1. Admin can do everything
CREATE POLICY "users_admin_full_access"
  ON public.users
  FOR ALL
  USING (
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb->>'role',
      ''
    ) = 'ADMIN'
  )
  WITH CHECK (
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb->>'role',
      ''
    ) = 'ADMIN'
  );

-- 2. Allow authenticated users to read all users (for UI)
CREATE POLICY "users_authenticated_select"
  ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 3. Allow users to read/update their own data
CREATE POLICY "users_self_update"
  ON public.users
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND 
    id = auth.uid()::text
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    id = auth.uid()::text
  );

-- 4. Allow authenticated users to insert their own profile
CREATE POLICY "users_self_insert"
  ON public.users
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    id = auth.uid()::text
  );

-- 5. CRITICAL: Allow first admin creation when no admin exists
CREATE POLICY "users_first_admin_insert"
  ON public.users
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    id = auth.uid()::text AND
    role = 'ADMIN' AND
    NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'ADMIN')
  );