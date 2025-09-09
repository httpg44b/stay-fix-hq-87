-- Update the notification trigger to also handle ticket creation
DROP TRIGGER IF EXISTS notify_ticket_changes ON tickets;
DROP FUNCTION IF EXISTS notify_ticket_changes CASCADE;

CREATE OR REPLACE FUNCTION public.notify_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  title text;
  message text;
  hotel_technicians RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify assigned technician
    IF NEW.assignee_id IS NOT NULL THEN
      title := 'Novo chamado atribuído';
      message := 'Você foi atribuído ao chamado: ' || NEW.title || '.';
      PERFORM public.create_notification(NEW.assignee_id, NEW.id, 'ticket_assigned', title, message);
    END IF;
    
    -- Notify all technicians from the hotel about new ticket
    FOR hotel_technicians IN 
      SELECT DISTINCT u.id
      FROM public.users u
      JOIN public.user_hotels uh ON u.id = uh.user_id
      WHERE uh.hotel_id = NEW.hotel_id
        AND u.role = 'TECNICO'
        AND u.is_active = true
        AND (NEW.assignee_id IS NULL OR u.id != NEW.assignee_id) -- Don't double notify assigned tech
    LOOP
      PERFORM public.create_notification(
        hotel_technicians.id, 
        NEW.id, 
        'ticket_created', 
        'Novo chamado aberto', 
        'Um novo chamado foi aberto: ' || NEW.title || '.'
      );
    END LOOP;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Notify on assignment change
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL THEN
      title := 'Chamado atribuído a você';
      message := 'Você foi atribuído ao chamado: ' || NEW.title || '.';
      PERFORM public.create_notification(NEW.assignee_id, NEW.id, 'ticket_assigned', title, message);
    END IF;

    -- Notify on status change
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.creator_id IS NOT NULL THEN
        PERFORM public.create_notification(NEW.creator_id, NEW.id, 'ticket_updated', 'Status atualizado', 'O status do chamado "' || NEW.title || '" mudou para ' || NEW.status || '.');
      END IF;
      IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != NEW.creator_id THEN
        PERFORM public.create_notification(NEW.assignee_id, NEW.id, 'ticket_updated', 'Status atualizado', 'O status do chamado "' || NEW.title || '" mudou para ' || NEW.status || '.');
      END IF;
    END IF;

    -- Notify on solution
    IF NEW.solution IS DISTINCT FROM OLD.solution AND COALESCE(NEW.solution,'') != '' THEN
      IF NEW.creator_id IS NOT NULL THEN
        PERFORM public.create_notification(NEW.creator_id, NEW.id, 'ticket_updated', 'Solução registrada', 'Uma solução foi registrada no chamado "' || NEW.title || '".');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER notify_ticket_changes
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_changes();