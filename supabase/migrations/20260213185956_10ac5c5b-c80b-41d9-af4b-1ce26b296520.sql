
-- Drop the existing hotel users select policy
DROP POLICY IF EXISTS "tickets_hotel_users_select" ON public.tickets;

-- Create a helper function to check if a user is RECEPCAO
CREATE OR REPLACE FUNCTION public.is_recepcao(_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _user_id AND role = 'RECEPCAO'
  );
$$;

-- Recreate the policy with RECEPCAO restrictions
-- RECEPCAO users can see:
--   1. Tickets created by any RECEPCAO user from their hotel (any status)
--   2. All COMPLETED tickets from their hotel
-- TECNICO/ADMIN users keep full hotel access
CREATE POLICY "tickets_hotel_users_select"
ON public.tickets
FOR SELECT
USING (
  is_admin()
  OR (creator_id = (auth.uid())::text)
  OR (
    hotel_id IN (
      SELECT uh.hotel_id FROM user_hotels uh
      JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = (auth.uid())::text AND u.is_active = true
    )
    AND (
      -- Non-RECEPCAO users (TECNICO) see all hotel tickets
      NOT is_recepcao((auth.uid())::text)
      OR (
        -- RECEPCAO users see only: completed tickets OR tickets created by RECEPCAO users
        status = 'COMPLETED'
        OR (creator_id IN (
          SELECT u2.id FROM users u2
          JOIN user_hotels uh2 ON uh2.user_id = u2.id
          WHERE u2.role = 'RECEPCAO'
          AND uh2.hotel_id = tickets.hotel_id
        ))
      )
    )
  )
);
