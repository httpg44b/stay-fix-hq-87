-- Create checklist_items table for individual tasks
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_items
CREATE POLICY "checklist_items_admin_all"
  ON public.checklist_items
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "checklist_items_technicians_select"
  ON public.checklist_items
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR 
    checklist_id IN (
      SELECT c.id 
      FROM checklists c
      INNER JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
      INNER JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO' 
        AND u.is_active = true
    )
  );

CREATE POLICY "checklist_items_technicians_insert"
  ON public.checklist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR 
    checklist_id IN (
      SELECT c.id 
      FROM checklists c
      INNER JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
      INNER JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO' 
        AND u.is_active = true
    )
  );

CREATE POLICY "checklist_items_technicians_update"
  ON public.checklist_items
  FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR 
    checklist_id IN (
      SELECT c.id 
      FROM checklists c
      INNER JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
      INNER JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO' 
        AND u.is_active = true
    )
  )
  WITH CHECK (
    is_admin() OR 
    checklist_id IN (
      SELECT c.id 
      FROM checklists c
      INNER JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
      INNER JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO' 
        AND u.is_active = true
    )
  );

CREATE POLICY "checklist_items_technicians_delete"
  ON public.checklist_items
  FOR DELETE
  TO authenticated
  USING (
    is_admin() OR 
    checklist_id IN (
      SELECT c.id 
      FROM checklists c
      INNER JOIN user_hotels uh ON c.hotel_id = uh.hotel_id
      INNER JOIN users u ON u.id = uh.user_id
      WHERE uh.user_id = auth.uid()::text 
        AND u.role = 'TECNICO' 
        AND u.is_active = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_is_completed ON public.checklist_items(is_completed);
CREATE INDEX idx_checklist_items_order ON public.checklist_items(checklist_id, order_index);