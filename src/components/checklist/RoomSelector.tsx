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
  ok: { circleColor: 'bg-green-500', buttonColor: 'bg-green-500 hover:bg-green-600', label: 'OK', textColor: 'text-white' },
  warning: { circleColor: 'bg-orange-500', buttonColor: 'bg-orange-500 hover:bg-orange-600', label: 'OK', textColor: 'text-white' },
  error: { circleColor: 'bg-red-500', buttonColor: 'bg-red-500 hover:bg-red-600', label: 'OC', textColor: 'text-white' },
  pending: { circleColor: 'bg-muted', buttonColor: 'bg-muted hover:bg-muted/80', label: '--', textColor: 'text-muted-foreground' },
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
    <ScrollArea className="h-[400px] pr-2">
      <div className="space-y-4">
        {Object.entries(roomsByFloor)
          .sort(([floorA], [floorB]) => {
            // Sort floors numerically if possible
            const numA = parseInt(floorA);
            const numB = parseInt(floorB);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return floorA.localeCompare(floorB);
          })
          .map(([floor, floorRooms]) => (
            <div key={floor} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{floor}</h3>
              <div className="space-y-1.5">
                {floorRooms.map((room) => {
                  const status = selectedRooms[room.id] || 'pending';
                  const config = STATUS_CONFIG[status];
                  
                  return (
                    <div
                      key={room.id}
                      className="flex items-center gap-2 p-1"
                    >
                      <button
                        type="button"
                        onClick={() => handleStatusClick(room.id, status)}
                        className={`w-6 h-6 rounded-md ${config.circleColor} flex items-center justify-center transition-colors flex-shrink-0`}
                        aria-label={`Changer le statut de la chambre ${room.number}`}
                      >
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </button>
                      
                      <span className="text-sm font-medium min-w-[90px]">
                        Chambre {room.number}
                      </span>
                      
                      <button
                        type="button"
                        onClick={() => handleStatusClick(room.id, status)}
                        className={`min-w-[50px] px-3 py-1 rounded-md font-medium text-xs ${config.buttonColor} ${config.textColor} transition-colors`}
                      >
                        {config.label}
                      </button>
                      
                      {(status === 'warning' || status === 'error') && (
                        <Input
                          type="text"
                          placeholder="Note..."
                          value={notes[room.id] || ''}
                          onChange={(e) => setNotes({ ...notes, [room.id]: e.target.value })}
                          className="flex-1 h-7 text-xs"
                        />
                      )}
                      
                      {status === 'ok' && (
                        <span className="text-sm font-medium text-muted-foreground ml-auto">
                          OK
                        </span>
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
