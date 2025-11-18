-- Fix security warning: Add search_path to send_welcome_email function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use pg_net to make async HTTP request to edge function
  PERFORM net.http_post(
    url := 'https://vesffhlaeycsulblwxsa.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlc2ZmaGxhZXljc3VsYmx3eHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTk0NzgsImV4cCI6MjA3Mjc3NTQ3OH0.ZAQVpZ2pKrkfrIxSmVCfIWxKdBPOGCH2g3CphTqIA5g'
    ),
    body := jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'display_name', NEW.display_name
    )::jsonb
  );
  
  RETURN NEW;
END;
$$;