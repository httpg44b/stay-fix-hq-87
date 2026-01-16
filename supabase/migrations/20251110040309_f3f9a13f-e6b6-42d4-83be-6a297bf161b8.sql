-- Move extensions to proper schema if they are in public
-- pg_cron and pg_net should not be in public schema for security
DO $$ 
BEGIN
  -- Check and move pg_cron if in public
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'pg_cron' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    DROP EXTENSION IF EXISTS pg_cron CASCADE;
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  END IF;

  -- Check and move pg_net if in public
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'pg_net' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    DROP EXTENSION IF EXISTS pg_net CASCADE;
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  END IF;
END $$;

-- Recreate the cron job after moving extensions
SELECT cron.schedule(
  'auto-update-ticket-status',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://vesffhlaeycsulblwxsa.supabase.co/functions/v1/auto-update-ticket-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlc2ZmaGxhZXljc3VsYmx3eHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTk0NzgsImV4cCI6MjA3Mjc3NTQ3OH0.ZAQVpZ2pKrkfrIxSmVCfIWxKdBPOGCH2g3CphTqIA5g"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
