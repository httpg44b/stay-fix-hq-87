-- Create a trigger to send email notifications when a notification is created
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result RECORD;
BEGIN
  -- Only send email for specific notification types
  IF NEW.type IN ('ticket_assigned', 'ticket_created', 'ticket_updated') THEN
    -- Call the edge function to send email
    -- Note: This is async and we don't wait for the result
    SELECT net.http_post(
      url := 'https://vesffhlaeycsulblwxsa.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlc2ZmaGxhZXljc3VsYmx3eHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTk0NzgsImV4cCI6MjA3Mjc3NTQ3OH0.ZAQVpZ2pKrkfrIxSmVCfIWxKdBPOGCH2g3CphTqIA5g'
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'ticket_id', NEW.ticket_id,
        'type', NEW.type,
        'title', NEW.title,
        'message', NEW.message
      )
    ) INTO result;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER send_notification_email_trigger
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_notification_email();