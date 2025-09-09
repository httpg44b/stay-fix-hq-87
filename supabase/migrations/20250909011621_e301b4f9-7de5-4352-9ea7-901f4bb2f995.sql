-- Fix remaining functions without search_path
-- Update create_user_as_admin
CREATE OR REPLACE FUNCTION public.create_user_as_admin(p_email text, p_password text, p_display_name text, p_role text, p_locale text DEFAULT 'pt-BR'::text, p_is_active boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Update create_user_profile
CREATE OR REPLACE FUNCTION public.create_user_profile(p_user_id text, p_email text, p_display_name text, p_role text, p_locale text DEFAULT 'pt-BR'::text, p_is_active boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Update create_initial_admin
CREATE OR REPLACE FUNCTION public.create_initial_admin()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Update create_admin_user_directly
CREATE OR REPLACE FUNCTION public.create_admin_user_directly()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  admin_user_id TEXT := '00000000-0000-0000-0000-000000000001';
  result json;
BEGIN
  -- Insert directly into users table
  INSERT INTO public.users (
    id, 
    email, 
    display_name, 
    role, 
    locale, 
    is_active
  ) VALUES (
    admin_user_id,
    'httpg44b@gmail.com',
    'admin',
    'ADMIN',
    'pt-BR',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;
  
  result := json_build_object(
    'success', true,
    'message', 'Admin user created/updated successfully',
    'user_id', admin_user_id
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
$function$;

-- Update setup_auth_for_admin
CREATE OR REPLACE FUNCTION public.setup_auth_for_admin()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  result json;
BEGIN
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
$function$;

-- Update fix_admin_user_id
CREATE OR REPLACE FUNCTION public.fix_admin_user_id(new_auth_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;