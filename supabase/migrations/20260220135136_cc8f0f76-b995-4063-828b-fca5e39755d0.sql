
-- Drop the existing complex select policy
DROP POLICY IF EXISTS "tickets_hotel_users_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_self_select" ON public.tickets;

-- Create simplified select policy: admin sees all, others see tickets from their hotels
CREATE POLICY "tickets_hotel_users_select"
ON public.tickets
FOR SELECT
USING (
  is_admin()
  OR (hotel_id IN (
    SELECT uh.hotel_id
    FROM user_hotels uh
    WHERE uh.user_id = (auth.uid())::text
  ))
);
