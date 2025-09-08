-- Restringe visualização de tickets ao criador (admins mantêm acesso total via policy existente)
DROP POLICY IF EXISTS tickets_users_select ON public.tickets;
DROP POLICY IF EXISTS tickets_self_select ON public.tickets;

CREATE POLICY tickets_self_select
ON public.tickets
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  creator_id = (auth.uid())::text
);