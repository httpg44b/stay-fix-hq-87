-- Notifications via triggers on tickets
CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  title text;
  message text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assignee_id IS NOT NULL THEN
      title := 'Novo chamado atribuído';
      message := 'Você foi atribuído ao chamado: ' || NEW.title || '.';
      PERFORM public.create_notification(NEW.assignee_id, NEW.id, 'ticket_assigned', title, message);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL THEN
      title := 'Chamado atribuído a você';
      message := 'Você foi atribuído ao chamado: ' || NEW.title || '.';
      PERFORM public.create_notification(NEW.assignee_id, NEW.id, 'ticket_assigned', title, message);
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.creator_id IS NOT NULL THEN
        PERFORM public.create_notification(NEW.creator_id, NEW.id, 'ticket_updated', 'Status atualizado', 'O status do chamado "' || NEW.title || '" mudou para ' || NEW.status || '.');
      END IF;
      IF NEW.assignee_id IS NOT NULL THEN
        PERFORM public.create_notification(NEW.assignee_id, NEW.id, 'ticket_updated', 'Status atualizado', 'O status do chamado "' || NEW.title || '" mudou para ' || NEW.status || '.');
      END IF;
    END IF;

    IF NEW.solution IS DISTINCT FROM OLD.solution AND COALESCE(NEW.solution,'') <> '' THEN
      IF NEW.creator_id IS NOT NULL THEN
        PERFORM public.create_notification(NEW.creator_id, NEW.id, 'ticket_updated', 'Solução registrada', 'Uma solução foi registrada no chamado "' || NEW.title || '".');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS tickets_notify_changes_insert ON public.tickets;
CREATE TRIGGER tickets_notify_changes_insert
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_changes();

DROP TRIGGER IF EXISTS tickets_notify_changes_update ON public.tickets;
CREATE TRIGGER tickets_notify_changes_update
AFTER UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_changes();