import { supabase } from '@/integrations/supabase/client';

export interface Room {
  id: string;
  hotel_id: string;
  number: string;
  floor: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomsByFloor {
  [floor: string]: Room[];
}

class RoomsService {
  async getByHotel(hotelId: string): Promise<Room[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('floor', { ascending: true })
      .order('number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  groupByFloor(rooms: Room[]): RoomsByFloor {
    const grouped: RoomsByFloor = {};
    
    rooms.forEach((room) => {
      const floor = room.floor || 'Sans étage';
      if (!grouped[floor]) {
        grouped[floor] = [];
      }
      grouped[floor].push(room);
    });

    return grouped;
  }
}

export const roomsService = new RoomsService();
