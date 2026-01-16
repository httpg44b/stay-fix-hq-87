
-- Drop existing policies for checklists that are too restrictive
DROP POLICY IF EXISTS "checklists_technicians_select" ON checklists;
DROP POLICY IF EXISTS "checklists_technicians_insert" ON checklists;
DROP POLICY IF EXISTS "checklists_technicians_update" ON checklists;
DROP POLICY IF EXISTS "checklists_technicians_delete" ON checklists;

-- Drop existing policies for checklist_items
DROP POLICY IF EXISTS "checklist_items_technicians_select" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_technicians_insert" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_technicians_update" ON checklist_items;
DROP POLICY IF EXISTS "checklist_items_technicians_delete" ON checklist_items;

-- Drop existing policies for checklist_room_status
DROP POLICY IF EXISTS "checklist_room_status_technicians_select" ON checklist_room_status;
DROP POLICY IF EXISTS "checklist_room_status_technicians_insert" ON checklist_room_status;
DROP POLICY IF EXISTS "checklist_room_status_technicians_update" ON checklist_room_status;
DROP POLICY IF EXISTS "checklist_room_status_technicians_delete" ON checklist_room_status;

-- Create a helper function to check if user is linked to a hotel
CREATE OR REPLACE FUNCTION public.user_has_hotel_access(check_hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_hotels uh
    JOIN users u ON u.id = uh.user_id
    WHERE uh.user_id = (auth.uid())::text 
    AND uh.hotel_id = check_hotel_id
    AND u.is_active = true
  )
$$;

-- NEW POLICIES FOR CHECKLISTS
-- All users linked to the hotel can SELECT checklists
CREATE POLICY "checklists_hotel_users_select" ON checklists
FOR SELECT TO authenticated
USING (
  is_admin() OR user_has_hotel_access(hotel_id)
);

-- All users linked to the hotel can INSERT checklists
CREATE POLICY "checklists_hotel_users_insert" ON checklists
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR user_has_hotel_access(hotel_id)
);

-- All users linked to the hotel can UPDATE checklists
CREATE POLICY "checklists_hotel_users_update" ON checklists
FOR UPDATE TO authenticated
USING (
  is_admin() OR user_has_hotel_access(hotel_id)
)
WITH CHECK (
  is_admin() OR user_has_hotel_access(hotel_id)
);

-- Only admins or creator can DELETE checklists
CREATE POLICY "checklists_hotel_users_delete" ON checklists
FOR DELETE TO authenticated
USING (
  is_admin() OR (creator_id = (auth.uid())::text AND user_has_hotel_access(hotel_id))
);

-- NEW POLICIES FOR CHECKLIST_ITEMS
-- All users linked to the hotel can SELECT checklist items
CREATE POLICY "checklist_items_hotel_users_select" ON checklist_items
FOR SELECT TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);

-- All users linked to the hotel can INSERT checklist items
CREATE POLICY "checklist_items_hotel_users_insert" ON checklist_items
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);

-- All users linked to the hotel can UPDATE checklist items
CREATE POLICY "checklist_items_hotel_users_update" ON checklist_items
FOR UPDATE TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
)
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);

-- All users linked to the hotel can DELETE checklist items
CREATE POLICY "checklist_items_hotel_users_delete" ON checklist_items
FOR DELETE TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);

-- NEW POLICIES FOR CHECKLIST_ROOM_STATUS
-- All users linked to the hotel can SELECT room statuses
CREATE POLICY "checklist_room_status_hotel_users_select" ON checklist_room_status
FOR SELECT TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);

-- All users linked to the hotel can INSERT room statuses
CREATE POLICY "checklist_room_status_hotel_users_insert" ON checklist_room_status
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);

-- All users linked to the hotel can UPDATE room statuses
CREATE POLICY "checklist_room_status_hotel_users_update" ON checklist_room_status
FOR UPDATE TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
)
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);

-- All users linked to the hotel can DELETE room statuses
CREATE POLICY "checklist_room_status_hotel_users_delete" ON checklist_room_status
FOR DELETE TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM checklists c
    WHERE c.id = checklist_id AND user_has_hotel_access(c.hotel_id)
  )
);
