import { useState, useEffect, useRef } from 'react';
import { Checklist, checklistsService, RoomStatus } from '@/services/checklists.service';
import { Hotel } from '@/services/hotels.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RoomSelector } from './RoomSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ChecklistCardProps {
  checklist: Checklist;
  hotel?: Hotel;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

export const ChecklistCard = ({ checklist, hotel, onEdit, onDelete, onUpdate }: ChecklistCardProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatus>>({});
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRoomStatuses();
  }, [checklist.id]);

  const loadRoomStatuses = async () => {
    try {
      const statuses = await checklistsService.getRoomStatuses(checklist.id);
      const statusMap: Record<string, RoomStatus> = {};
      statuses.forEach(status => {
        statusMap[status.room_id] = status.status as RoomStatus;
      });
      setRoomStatuses(statusMap);
    } catch (error) {
      console.error('Error loading room statuses:', error);
    }
  };

  const handleRoomStatusChange = async (roomId: string, status: RoomStatus) => {
    try {
      setLoading(true);
      await checklistsService.setRoomStatus(checklist.id, roomId, status);
      setRoomStatuses((prev) => ({ ...prev, [roomId]: status }));
      toast({
        title: 'Succès',
        description: 'Statut mis à jour',
      });
    } catch (error) {
      console.error('Error updating room status:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!printRef.current) return;

    try {
      setIsPrinting(true);
      
      toast({
        title: 'Génération du PDF',
        description: 'Veuillez patienter...',
      });

      // Wait for the DOM to update with full content
      await new Promise(resolve => setTimeout(resolve, 100));

      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
        windowWidth: printRef.current.scrollWidth,
        windowHeight: printRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${checklist.title}_${hotel?.name || 'checklist'}.pdf`);
      
      toast({
        title: 'Succès',
        description: 'PDF généré avec succès',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la génération du PDF',
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const okCount = Object.values(roomStatuses).filter(s => s === 'ok').length;
  const warningCount = Object.values(roomStatuses).filter(s => s === 'warning').length;
  const errorCount = Object.values(roomStatuses).filter(s => s === 'error').length;
  const notVerifiedCount = Object.values(roomStatuses).filter(s => s === 'not_verified').length;
  const totalCount = Object.keys(roomStatuses).length;

  return (
    <>
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer" 
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{checklist.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{hotel?.name}</p>
            </div>
            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Statut des chambres</span>
              <span className="font-medium">{totalCount} chambres</span>
            </div>
            <div className="flex gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>{okCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span>{warningCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span>{errorCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-300"></div>
                <span>{notVerifiedCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full">
          <div ref={printRef}>
            <DialogHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <DialogTitle className="text-lg sm:text-xl">{checklist.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{hotel?.name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPDF}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Printer className="h-4 w-4" />
                  <span className="sm:inline">Imprimer PDF</span>
                </Button>
              </div>
            </DialogHeader>
            <div className="mt-4" style={isPrinting ? { minHeight: '100%' } : undefined}>
              {hotel && (
                <RoomSelector
                  hotelId={hotel.id}
                  selectedRooms={roomStatuses}
                  onRoomStatusChange={handleRoomStatusChange}
                  isPrinting={isPrinting}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
