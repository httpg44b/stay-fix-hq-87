-- Create storage bucket for ticket images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-images', 'ticket-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for ticket images
CREATE POLICY "Users can upload ticket images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'ticket-images' AND 
  (auth.uid() IS NOT NULL)
);

CREATE POLICY "Anyone can view ticket images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ticket-images');

CREATE POLICY "Users can update their own ticket images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'ticket-images' AND 
  (auth.uid() IS NOT NULL)
);

CREATE POLICY "Users can delete their own ticket images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'ticket-images' AND 
  (auth.uid() IS NOT NULL)
);

-- Add images column to tickets if not exists
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Function to get technicians for a hotel
CREATE OR REPLACE FUNCTION public.get_hotel_technicians(_hotel_id uuid)
RETURNS TABLE (
  id text,
  display_name text,
  email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT u.id, u.display_name, u.email
  FROM public.users u
  JOIN public.user_hotels uh ON u.id = uh.user_id
  WHERE uh.hotel_id = _hotel_id
    AND u.role = 'TECNICO'
    AND u.is_active = true
  ORDER BY u.display_name;
$$;