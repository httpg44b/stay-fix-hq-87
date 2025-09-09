-- Adicionar coluna de solução na tabela tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS solution_images TEXT[];

-- Atualizar política para permitir que técnicos atualizem tickets dos hotéis vinculados
DROP POLICY IF EXISTS tickets_users_update ON public.tickets;

CREATE POLICY tickets_users_update 
ON public.tickets 
FOR UPDATE 
USING (
  is_admin() OR 
  creator_id = (auth.uid())::text OR 
  assignee_id = (auth.uid())::text OR
  hotel_id IN (
    SELECT hotel_id 
    FROM user_hotels 
    WHERE user_id = (auth.uid())::text
  )
)
WITH CHECK (
  is_admin() OR 
  hotel_id IN (
    SELECT hotel_id 
    FROM user_hotels 
    WHERE user_id = (auth.uid())::text
  )
);