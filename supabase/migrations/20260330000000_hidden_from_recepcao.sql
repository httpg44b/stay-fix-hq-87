-- Add hidden_from_recepcao column to tickets table
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS hidden_from_recepcao BOOLEAN NOT NULL DEFAULT FALSE;

-- Recreate the select policy adding the hidden_from_recepcao filter for RECEPCAO users
DROP POLICY IF EXISTS "tickets_hotel_users_select" ON public.tickets;

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
      -- TECNICO sees all hotel tickets
      NOT is_recepcao((auth.uid())::text)
      OR (
        -- RECEPCAO: hidden tickets are never visible
        hidden_from_recepcao = FALSE
        AND (
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
  )
);
