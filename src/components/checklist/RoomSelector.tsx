import { useState, useEffect } from 'react';
import { Room, roomsService, RoomsByFloor } from '@/services/rooms.service';
import { RoomStatus } from '@/services/checklists.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RoomSelectorProps {
  hotelId: string;
  selectedRooms: Record<string, RoomStatus>;
  onRoomStatusChange: (roomId: string, status: RoomStatus) => void;
}

const STATUS_CONFIG = {
  ok: { color: 'bg-green-500', label: 'OK' },
  warning: { color: 'bg-orange-500', label: 'OK' },
  error: { color: 'bg-red-500', label: 'OC' },
  pending: { color: 'bg-gray-300', label: '--' },
};

export const RoomSelector = ({ hotelId, selectedRooms, onRoomStatusChange }: RoomSelectorProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsByFloor, setRoomsByFloor] = useState<RoomsByFloor>({});
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

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

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-6">
        {Object.entries(roomsByFloor)
          .sort(([floorA], [floorB]) => {
            // Sort floors numerically if possible
            const numA = parseInt(floorA);
            const numB = parseInt(floorB);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return floorA.localeCompare(floorB);
          })
          .map(([floor, floorRooms]) => (
            <div key={floor} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">{floor}</h3>
              <div className="space-y-2">
                {floorRooms.map((room) => {
                  const status = selectedRooms[room.id] || 'pending';
                  const config = STATUS_CONFIG[status];
                  
                  return (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleStatusClick(room.id, status)}
                        className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white font-medium text-sm hover:opacity-80 transition-opacity`}
                        aria-label={`Changer le statut de la chambre ${room.number}`}
                      >
                        <div className="w-3 h-3 rounded-full border-2 border-white" />
                      </button>
                      
                      <span className="text-base font-medium min-w-[120px]">
                        Chambre {room.number}
                      </span>
                      
                      <Button
                        type="button"
                        variant={status === 'ok' ? 'default' : status === 'warning' ? 'secondary' : status === 'error' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusClick(room.id, status)}
                        className="min-w-[60px]"
                      >
                        {config.label}
                      </Button>
                      
                      {(status === 'warning' || status === 'error') && (
                        <Input
                          type="text"
                          placeholder="Note..."
                          value={notes[room.id] || ''}
                          onChange={(e) => setNotes({ ...notes, [room.id]: e.target.value })}
                          className="flex-1"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </ScrollArea>
  );
};
