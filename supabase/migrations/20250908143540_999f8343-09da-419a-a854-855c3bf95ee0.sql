-- Re-enable RLS and create the corresponding auth user
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a function to handle the auth user creation for the existing profile
CREATE OR REPLACE FUNCTION public.setup_auth_for_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Since we can't create auth users directly from SQL, 
  -- we'll return instructions for manual setup
  result := json_build_object(
    'success', true,
    'message', 'Profile created. Now signup with email httpg44b@gmail.com to activate auth.',
    'instructions', json_build_object(
      'email', 'httpg44b@gmail.com',
      'password', '02120909',
      'action', 'Use signup form to create auth user'
    )
  );
  
  RETURN result;
END;
$$;

-- Also, let's update the existing user to have the correct auth ID if needed
-- We'll create a function to fix the user ID after auth signup
CREATE OR REPLACE FUNCTION public.fix_admin_user_id(new_auth_id TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Update the user ID to match the auth user ID
  UPDATE public.users 
  SET id = new_auth_id 
  WHERE email = 'httpg44b@gmail.com' 
  AND role = 'ADMIN';
  
  result := json_build_object(
    'success', true,
    'message', 'Admin user ID updated successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN result;
END;
$$;