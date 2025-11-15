-- Create public storage bucket for email assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create policy to allow public read access
CREATE POLICY "Public read access for email assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- Create policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload email assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'email-assets' 
  AND auth.role() = 'authenticated'
);