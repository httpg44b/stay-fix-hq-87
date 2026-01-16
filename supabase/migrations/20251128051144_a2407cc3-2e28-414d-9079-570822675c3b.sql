-- Drop the existing check constraint and add a new one with 'not_verified'
ALTER TABLE checklist_room_status DROP CONSTRAINT IF EXISTS checklist_room_status_status_check;

ALTER TABLE checklist_room_status ADD CONSTRAINT checklist_room_status_status_check 
  CHECK (status IN ('ok', 'warning', 'error', 'pending', 'not_verified'));

-- Update the default value to 'not_verified'
ALTER TABLE checklist_room_status ALTER COLUMN status SET DEFAULT 'not_verified';