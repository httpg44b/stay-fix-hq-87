-- Add floor field to rooms table to organize rooms by floor
ALTER TABLE public.rooms
ADD COLUMN floor text;

-- Add index for better performance when querying rooms by hotel and floor
CREATE INDEX idx_rooms_hotel_floor ON public.rooms(hotel_id, floor);