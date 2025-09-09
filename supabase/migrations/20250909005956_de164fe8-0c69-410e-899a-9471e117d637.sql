-- Ajustar política RLS para permitir que técnicos vejam tickets dos hotéis vinculados
DROP POLICY IF EXISTS tickets_hotel_users_select ON public.tickets;

CREATE POLICY tickets_hotel_users_select
ON public.tickets
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  is_admin() OR 
  creator_id = (auth.uid())::text OR
  hotel_id IN (
    SELECT hotel_id 
    FROM user_hotels 
    WHERE user_id = (auth.uid())::text
  )
);