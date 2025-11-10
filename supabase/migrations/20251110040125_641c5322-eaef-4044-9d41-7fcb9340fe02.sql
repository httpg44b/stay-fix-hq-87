-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the auto-update function to run every 15 minutes
-- This will check for tickets older than 1 hour and update them to IN_PROGRESS
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
