-- Fix the existing auth user by creating their profile
-- The user ID from the auth signup is: e6a78076-3521-4fc7-9c5d-d49efae0149c

-- First, let's insert the user profile directly
INSERT INTO public.users (id, email, display_name, role, locale, is_active)
VALUES (
  'e6a78076-3521-4fc7-9c5d-d49efae0149c',
  'httpg44b@gmail.com', 
  'Admin',
  'ADMIN',
  'pt-BR',
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Also fix the RLS policies to be more permissive for initial setup
DROP POLICY IF EXISTS "users_first_admin_insert" ON public.users;

-- Create a better policy that allows any authenticated user to create their own profile
CREATE POLICY "users_create_own_profile"
  ON public.users
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    id = auth.uid()::text
  );

-- Also create a policy that allows creating admin when no admin exists
CREATE POLICY "allow_first_admin"
  ON public.users
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    id = auth.uid()::text AND
    role = 'ADMIN' AND
    NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'ADMIN' AND id != auth.uid()::text)
  );