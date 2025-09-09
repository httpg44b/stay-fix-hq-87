-- Ajustar a tabela de tickets para melhor relacionamento com usuários
-- Adicionar função para buscar dados completos do técnico

CREATE OR REPLACE FUNCTION public.get_user_display_name(_user_id text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name 
  FROM public.users 
  WHERE id = _user_id
  LIMIT 1;
$$;

-- Adicionar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'ticket_assigned', 'ticket_updated', 'ticket_commented'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY notifications_users_select 
ON public.notifications 
FOR SELECT 
USING (user_id = (auth.uid())::text);

CREATE POLICY notifications_users_update 
ON public.notifications 
FOR UPDATE 
USING (user_id = (auth.uid())::text)
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY notifications_admin_all 
ON public.notifications 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Criar função para criar notificação
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
SET search_path = public
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

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;