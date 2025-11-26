import { useState, useEffect } from 'react';
import { Room, roomsService, RoomsByFloor } from '@/services/rooms.service';
import { RoomStatus } from '@/services/checklists.service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RoomSelectorProps {
  hotelId: string;
  selectedRooms: Record<string, RoomStatus>;
  onRoomStatusChange: (roomId: string, status: RoomStatus) => void;
  isPrinting?: boolean;
}

const STATUS_CONFIG = {
  ok: { color: 'bg-green-500', label: 'Bon état' },
  warning: { color: 'bg-orange-500', label: 'À vérifier ou À corriger' },
  error: { color: 'bg-red-500', label: 'Non conforme ou À réparer d\'urgence' },
};

export const RoomSelector = ({ hotelId, selectedRooms, onRoomStatusChange, isPrinting = false }: RoomSelectorProps) => {
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

  const handleStatusSelect = (roomId: string, status: RoomStatus) => {
    onRoomStatusChange(roomId, status);
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

  const content = (
    <div className="grid grid-cols-2 gap-6">
        {sortedFloors.map(([floor, floorRooms]) => (
          <div key={floor} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">{floor}</h3>
            <div className="space-y-2">
              {floorRooms.map((room) => {
                const status = selectedRooms[room.id] || 'error';
                const config = STATUS_CONFIG[status] || STATUS_CONFIG.error;
                
                return (
                  <Popover key={room.id}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors w-full text-left"
                        aria-label={`Changer le statut de la chambre ${room.number}`}
                      >
                        <span className="text-sm font-medium">
                          Chambre {room.number}
                        </span>
                        
                        <div className={`px-3 py-1 rounded-md ${config.color} flex items-center justify-center transition-colors flex-shrink-0`}>
                          <span className="text-xs font-medium text-white whitespace-nowrap">
                            {config.label}
                          </span>
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                      <div className="space-y-1">
                        {(Object.entries(STATUS_CONFIG) as [RoomStatus, { color: string; label: string }][]).map(([statusKey, statusConfig]) => (
                          <button
                            key={statusKey}
                            type="button"
                            onClick={() => handleStatusSelect(room.id, statusKey)}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors w-full text-left"
                          >
                            <div className={`w-5 h-5 rounded-md ${statusConfig.color} flex items-center justify-center flex-shrink-0`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                            <span className="text-sm">{statusConfig.label}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        ))}
      </div>
  );

  if (isPrinting) {
    return <div className="p-4">{content}</div>;
  }

  return (
    <ScrollArea className="h-[400px] pr-2">
      {content}
    </ScrollArea>
  );
};
