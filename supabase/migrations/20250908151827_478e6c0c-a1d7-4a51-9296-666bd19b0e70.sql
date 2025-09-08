-- Create hotels table
CREATE TABLE public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  cnpj TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- Create junction table for user-hotel relationships
CREATE TABLE public.user_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, hotel_id)
);

-- Enable RLS
ALTER TABLE public.user_hotels ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hotels_updated_at
BEFORE UPDATE ON public.hotels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for hotels
-- Only admins can manage hotels
CREATE POLICY hotels_admin_all
ON public.hotels
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Authenticated users can view active hotels they're assigned to
CREATE POLICY hotels_users_select
ON public.hotels
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    public.is_admin() 
    OR (
      is_active = true 
      AND id IN (
        SELECT hotel_id 
        FROM public.user_hotels 
        WHERE user_id = auth.uid()::text
      )
    )
  )
);

-- RLS Policies for user_hotels
-- Admins can manage all assignments
CREATE POLICY user_hotels_admin_all
ON public.user_hotels
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users can view their own assignments
CREATE POLICY user_hotels_users_select
ON public.user_hotels
FOR SELECT
USING (auth.uid()::text = user_id);