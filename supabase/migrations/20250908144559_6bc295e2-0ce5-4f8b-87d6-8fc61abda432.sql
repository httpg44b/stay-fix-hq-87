-- Update the existing user with the correct auth ID
UPDATE public.users 
SET id = 'e6a78076-3521-4fc7-9c5d-d49efae0149c'
WHERE email = 'httpg44b@gmail.com';

-- Fix the RLS policies to be more permissive for initial setup
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