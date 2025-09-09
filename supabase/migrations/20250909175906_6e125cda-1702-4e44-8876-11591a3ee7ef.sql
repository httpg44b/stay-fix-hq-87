-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS send_notification_email_trigger ON notifications;
DROP FUNCTION IF EXISTS send_notification_email CASCADE;

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a simpler function to send email notifications
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only send email for specific notification types
  IF NEW.type IN ('ticket_assigned', 'ticket_created') THEN
    -- Use pg_net to make async HTTP request to edge function
    PERFORM net.http_post(
      url := 'https://vesffhlaeycsulblwxsa.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlc2ZmaGxhZXljc3VsYmx3eHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTk0NzgsImV4cCI6MjA3Mjc3NTQ3OH0.ZAQVpZ2pKrkfrIxSmVCfIWxKdBPOGCH2g3CphTqIA5g'
      ),
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'ticket_id', NEW.ticket_id,
        'type', NEW.type,
        'title', NEW.title,
        'message', NEW.message
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER send_notification_email_trigger
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_notification_email();