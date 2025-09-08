-- Create initial admin user for testing
-- Note: This user needs to be created through Supabase Auth first
-- We'll just insert a test profile assuming the auth user exists

-- First, let's create a function to check if we need to create the initial admin
CREATE OR REPLACE FUNCTION public.create_initial_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if any admin exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'ADMIN') THEN
    -- Insert a default admin (you'll need to create this user in Supabase Auth first)
    -- Email: admin@hotelfix.com
    -- Password: Admin123!
    
    -- For now, we'll just log that admin needs to be created
    RAISE NOTICE 'No admin user exists. Please create an admin user through the signup flow.';
  END IF;
END;
$$;

-- Execute the function
SELECT public.create_initial_admin();

-- Also, let's simplify the RLS policies to be more permissive during development
DROP POLICY IF EXISTS "service_role_insert" ON public.users;

-- Create a simpler policy that allows any authenticated user to see all users (for testing)
CREATE POLICY "users_read_all"
  ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);