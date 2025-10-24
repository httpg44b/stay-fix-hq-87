-- Create enum for checklist status
CREATE TYPE public.checklist_status AS ENUM ('pending', 'in_progress', 'completed');

-- Create checklists table
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status checklist_status NOT NULL DEFAULT 'pending',
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  creator_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "checklists_admin_all" 
ON public.checklists 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Technicians can view checklists from their hotels
CREATE POLICY "checklists_technicians_select" 
ON public.checklists 
FOR SELECT 
USING (
  is_admin() OR 
  (
    hotel_id IN (
      SELECT uh.hotel_id 
      FROM user_hotels uh
      JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO'
        AND u.is_active = true
    )
  )
);

-- Technicians can insert checklists for their hotels
CREATE POLICY "checklists_technicians_insert" 
ON public.checklists 
FOR INSERT 
WITH CHECK (
  is_admin() OR 
  (
    creator_id = auth.uid()::text AND
    hotel_id IN (
      SELECT uh.hotel_id 
      FROM user_hotels uh
      JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO'
        AND u.is_active = true
    )
  )
);

-- Technicians can update checklists from their hotels
CREATE POLICY "checklists_technicians_update" 
ON public.checklists 
FOR UPDATE 
USING (
  is_admin() OR 
  (
    hotel_id IN (
      SELECT uh.hotel_id 
      FROM user_hotels uh
      JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO'
        AND u.is_active = true
    )
  )
)
WITH CHECK (
  is_admin() OR 
  (
    hotel_id IN (
      SELECT uh.hotel_id 
      FROM user_hotels uh
      JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO'
        AND u.is_active = true
    )
  )
);

-- Technicians can delete checklists from their hotels
CREATE POLICY "checklists_technicians_delete" 
ON public.checklists 
FOR DELETE 
USING (
  is_admin() OR 
  (
    hotel_id IN (
      SELECT uh.hotel_id 
      FROM user_hotels uh
      JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO'
        AND u.is_active = true
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_checklists_updated_at
BEFORE UPDATE ON public.checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_checklists_hotel_id ON public.checklists(hotel_id);
CREATE INDEX idx_checklists_creator_id ON public.checklists(creator_id);
CREATE INDEX idx_checklists_status ON public.checklists(status);