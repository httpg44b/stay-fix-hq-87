-- Make the ticket-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'ticket-images';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Anyone can view ticket images" ON storage.objects;

-- Create a new policy that only allows authenticated users from the same hotel to view images
CREATE POLICY "Authenticated users can view ticket images from their hotel"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_hotels uh
    JOIN tickets t ON t.hotel_id = uh.hotel_id
    WHERE uh.user_id = (auth.uid())::text
    AND t.images @> ARRAY[name]
  )
);