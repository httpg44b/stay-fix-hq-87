-- Fix is_admin function with CREATE OR REPLACE (without DROP)
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