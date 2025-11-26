import { useState, useEffect } from 'react';
import { Room, roomsService, RoomsByFloor } from '@/services/rooms.service';
import { RoomStatus } from '@/services/checklists.service';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RoomSelectorProps {
  hotelId: string;
  selectedRooms: Record<string, RoomStatus>;
  onRoomStatusChange: (roomId: string, status: RoomStatus) => void;
}

const STATUS_CONFIG = {
  ok: { color: 'bg-green-500' },
  warning: { color: 'bg-orange-500' },
  error: { color: 'bg-red-500' },
  pending: { color: 'bg-muted' },
};

export const RoomSelector = ({ hotelId, selectedRooms, onRoomStatusChange }: RoomSelectorProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsByFloor, setRoomsByFloor] = useState<RoomsByFloor>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, [hotelId]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomsData = await roomsService.getByHotel(hotelId);
      setRooms(roomsData);
      setRoomsByFloor(roomsService.groupByFloor(roomsData));
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (roomId: string, currentStatus?: RoomStatus) => {
    const statusCycle: RoomStatus[] = ['pending', 'ok', 'warning', 'error'];
    const currentIndex = statusCycle.indexOf(currentStatus || 'pending');
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    onRoomStatusChange(roomId, nextStatus);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        0 chambre cadastré
      </div>
    );
  }

  const sortedFloors = Object.entries(roomsByFloor).sort(([floorA], [floorB]) => {
    const numA = parseInt(floorA);
    const numB = parseInt(floorB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return floorA.localeCompare(floorB);
  });

  return (
    <ScrollArea className="h-[400px] pr-2">
      <div className="grid grid-cols-2 gap-6">
        {sortedFloors.map(([floor, floorRooms]) => (
          <div key={floor} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">{floor}</h3>
            <div className="space-y-2">
              {floorRooms.map((room) => {
                const status = selectedRooms[room.id] || 'pending';
                const config = STATUS_CONFIG[status];
                
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleStatusClick(room.id, status)}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors w-full text-left"
                    aria-label={`Changer le statut de la chambre ${room.number}`}
                  >
                    <div className={`w-6 h-6 rounded-md ${config.color} flex items-center justify-center transition-colors flex-shrink-0`}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    
                    <span className="text-sm font-medium">
                      Chambre {room.number}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
