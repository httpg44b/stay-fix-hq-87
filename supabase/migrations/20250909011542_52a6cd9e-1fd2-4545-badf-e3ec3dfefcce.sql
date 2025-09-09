-- Fix security issues - Update functions instead of dropping
-- Update functions to fix search_path issues

-- 1. Update is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()::text
      AND role = 'ADMIN'
      AND is_active = true
  );
$function$;

-- 2. Update get_user_display_name
CREATE OR REPLACE FUNCTION public.get_user_display_name(_user_id text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT display_name 
  FROM public.users 
  WHERE id = _user_id
  LIMIT 1;
$$;

-- 3. Update create_notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id text,
  _ticket_id uuid,
  _type text,
  _title text,
  _message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
  VALUES (_user_id, _ticket_id, _type, _title, _message)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- 4. Update update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;