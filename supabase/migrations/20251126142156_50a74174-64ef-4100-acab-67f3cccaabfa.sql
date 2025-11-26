-- Create table to store room status for each checklist
CREATE TABLE IF NOT EXISTS public.checklist_room_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('ok', 'warning', 'error', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(checklist_id, room_id)
);

-- Create index for better performance
CREATE INDEX idx_checklist_room_status_checklist ON public.checklist_room_status(checklist_id);
CREATE INDEX idx_checklist_room_status_room ON public.checklist_room_status(room_id);

-- Enable RLS
ALTER TABLE public.checklist_room_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_room_status
CREATE POLICY "checklist_room_status_admin_all" 
ON public.checklist_room_status 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "checklist_room_status_technicians_select" 
ON public.checklist_room_status 
FOR SELECT 
USING (
  is_admin() OR 
  checklist_id IN (
    SELECT c.id FROM checklists c
    JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
    JOIN users u ON u.id = uh.user_id
    WHERE uh.user_id = auth.uid()::text
    AND u.role = 'TECNICO'
    AND u.is_active = true
  )
);

CREATE POLICY "checklist_room_status_technicians_insert" 
ON public.checklist_room_status 
FOR INSERT 
WITH CHECK (
  is_admin() OR 
  checklist_id IN (
    SELECT c.id FROM checklists c
    JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
    JOIN users u ON u.id = uh.user_id
    WHERE uh.user_id = auth.uid()::text
    AND u.role = 'TECNICO'
    AND u.is_active = true
  )
);

CREATE POLICY "checklist_room_status_technicians_update" 
ON public.checklist_room_status 
FOR UPDATE 
USING (
  is_admin() OR 
  checklist_id IN (
    SELECT c.id FROM checklists c
    JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
    JOIN users u ON u.id = uh.user_id
    WHERE uh.user_id = auth.uid()::text
    AND u.role = 'TECNICO'
    AND u.is_active = true
  )
)
WITH CHECK (
  is_admin() OR 
  checklist_id IN (
    SELECT c.id FROM checklists c
    JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
    JOIN users u ON u.id = uh.user_id
    WHERE uh.user_id = auth.uid()::text
    AND u.role = 'TECNICO'
    AND u.is_active = true
  )
);

CREATE POLICY "checklist_room_status_technicians_delete" 
ON public.checklist_room_status 
FOR DELETE 
USING (
  is_admin() OR 
  checklist_id IN (
    SELECT c.id FROM checklists c
    JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
    JOIN users u ON u.id = uh.user_id
    WHERE uh.user_id = auth.uid()::text
    AND u.role = 'TECNICO'
    AND u.is_active = true
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_checklist_room_status_updated_at
BEFORE UPDATE ON public.checklist_room_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();