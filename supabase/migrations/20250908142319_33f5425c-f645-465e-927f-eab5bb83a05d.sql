-- Fix RLS policies for users table to allow proper user creation

-- Drop existing policies
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_self_select" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;

-- Create more permissive policies

-- Admin can do everything
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

-- Allow authenticated users to read their own data
CREATE POLICY "users_self_select"
  ON public.users
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND 
    id = auth.uid()::text
  );

-- Allow any authenticated user to insert their own profile (for signup)
CREATE POLICY "users_self_insert"
  ON public.users
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    id = auth.uid()::text
  );

-- Allow users to update their own data
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

-- Temporary policy to allow service role to insert users (for admin creation)
CREATE POLICY "service_role_insert"
  ON public.users
  FOR INSERT
  WITH CHECK (
    current_setting('role') = 'service_role'
  );