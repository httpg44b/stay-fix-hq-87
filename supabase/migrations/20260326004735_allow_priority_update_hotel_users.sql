-- Allow TECNICO and RECEPCAO to update ticket priority for hotels they are linked to.
-- The existing tickets_users_update policy already permits full UPDATE for hotel users,
-- but this migration makes the intent explicit and adds a dedicated policy.

-- Drop the existing broad update policy
DROP POLICY IF EXISTS "tickets_users_update" ON public.tickets;

-- Admins can update any ticket (all fields)
CREATE POLICY "tickets_admin_update"
ON public.tickets
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- TECNICO and RECEPCAO can update tickets from their hotels
-- Allowed fields include: status, priority, solution, solution_images, assignee_id, scheduled_date
CREATE POLICY "tickets_hotel_users_update"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  NOT is_admin()
  AND user_has_hotel_access(hotel_id)
)
WITH CHECK (
  NOT is_admin()
  AND user_has_hotel_access(hotel_id)
);
