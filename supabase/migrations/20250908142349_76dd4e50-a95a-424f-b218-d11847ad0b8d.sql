-- Create function to allow admins to create users
CREATE OR REPLACE FUNCTION public.create_user_as_admin(
  p_email TEXT,
  p_password TEXT,
  p_display_name TEXT,
  p_role TEXT,
  p_locale TEXT DEFAULT 'pt-BR',
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  result json;
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Create the auth user (this will trigger email confirmation)
  -- We'll use the raw SQL to create the user in auth schema
  -- For now, we'll return an error message to use client-side signup
  
  -- Since we can't create auth users directly from SQL, 
  -- we'll just prepare the user data and let the client handle auth creation
  result := json_build_object(
    'success', false,
    'message', 'User must be created through auth.signUp first',
    'data', json_build_object(
      'email', p_email,
      'display_name', p_display_name,
      'role', p_role,
      'locale', p_locale,
      'is_active', p_is_active
    )
  );
  
  RETURN result;
END;
$$;

-- Allow admins to directly insert user profiles after auth creation
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id TEXT,
  p_email TEXT,
  p_display_name TEXT,
  p_role TEXT,
  p_locale TEXT DEFAULT 'pt-BR',
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid()::text 
    AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Only admins can create user profiles';
  END IF;

  -- Insert the user profile
  INSERT INTO public.users (id, email, display_name, role, locale, is_active)
  VALUES (p_user_id, p_email, p_display_name, p_role, p_locale, p_is_active);
  
  result := json_build_object(
    'success', true,
    'message', 'User profile created successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    result := json_build_object(
      'success', false,
      'message', 'User profile already exists'
    );
    RETURN result;
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_user_as_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;