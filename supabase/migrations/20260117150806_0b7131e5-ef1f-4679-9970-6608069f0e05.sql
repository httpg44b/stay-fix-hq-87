-- Fix storage SELECT policy for private ticket-images bucket
-- Current policy checks tickets.images contains objects.name, but tickets.images stores full URLs.
-- This policy instead authorizes reads based on folder prefix (ticket_id/) and user's hotel access.

DROP POLICY IF EXISTS "Authenticated users can view ticket images from their hotel" ON storage.objects;

CREATE POLICY "Authenticated users can view ticket images from their hotel"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'ticket-images'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.tickets t
    JOIN public.user_hotels uh ON uh.hotel_id = t.hotel_id
    WHERE uh.user_id = auth.uid()::text
      AND objects.name LIKE t.id || '/%'
  )
);
