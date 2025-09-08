-- Create a SECURITY DEFINER function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()::text
      AND role = 'ADMIN'
      AND is_active = true
  );
$$;

-- Replace the existing admin full access policy to use the function
DROP POLICY IF EXISTS users_admin_full_access ON public.users;

CREATE POLICY users_admin_full_access
ON public.users
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());