import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, Save, CheckCircle, Loader2, Calendar, User, MapPin, FileText, Building } from 'lucide-react';
import { TicketStatus, statusLabels, categoryLabels, UserRole } from '@/lib/constants';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketModalProps {
  ticketId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function TicketModal({ ticketId, isOpen, onClose, onUpdate }: TicketModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [solution, setSolution] = useState('');
  const [status, setStatus] = useState<TicketStatus>(TicketStatus.NEW);
  const [solutionImages, setSolutionImages] = useState<string[]>([]);

  useEffect(() => {
    if (ticketId && isOpen) {
      loadTicket();
    }
  }, [ticketId, isOpen]);

  const loadTicket = async () => {
    if (!ticketId) return;
    
    try {
      setLoading(true);
      const data = await ticketsService.getById(ticketId);
      setTicket(data);
      setSolution(data.solution || '');
      setStatus(data.status);
      setSolutionImages(data.solution_images || []);
      
      // Load hotel info
      if (data.hotel_id) {
        const hotelData = await hotelsService.getById(data.hotel_id);
        setHotel(hotelData);
      }
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      toast({
        title: 'Erro ao carregar chamado',
        description: error.message || 'Ocorreu um erro ao carregar o chamado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await ticketsService.update(ticket.id, {
        status,
        solution,
        solution_images: solutionImages,
        ...(status === TicketStatus.COMPLETED && { closed_at: new Date().toISOString() })
      });

      toast({
        title: 'Chamado atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Erro ao atualizar chamado',
        description: error.message || 'Ocorreu um erro ao atualizar o chamado.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, upload to server and get URLs
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setSolutionImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSolutionImages(prev => prev.filter((_, i) => i !== index));
  };

  const canEdit = user?.role === UserRole.ADMIN || 
                   user?.role === UserRole.TECNICO ||
                   (user?.role === UserRole.RECEPCAO && ticket?.creator_id === user?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : ticket ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{ticket.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-4 mt-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <Badge variant="outline">
                  {categoryLabels[ticket.category as keyof typeof categoryLabels]}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Ticket Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Quarto/Área:</span>
                      <span className="font-medium">{ticket.room_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Hotel:</span>
                      <span className="font-medium">{hotel?.name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Criado em:</span>
                      <span className="font-medium">
                        {format(new Date(ticket.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Técnico:</span>
                      <span className="font-medium">{ticket.assignee_id || 'Não atribuído'}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Descrição
                    </Label>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {ticket.description}
                    </p>
                  </div>

                  {/* Status Update */}
                  {canEdit && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="status">Status do Chamado</Label>
                        <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus)}>
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Solution Section */}
                  {(canEdit || solution) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="solution" className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Solução
                        </Label>
                        {canEdit ? (
                          <Textarea
                            id="solution"
                            placeholder="Descreva a solução aplicada ou o andamento do chamado..."
                            value={solution}
                            onChange={(e) => setSolution(e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            {solution || 'Nenhuma solução registrada ainda.'}
                          </p>
                        )}
                      </div>

                      {/* Solution Images */}
                      {canEdit && (
                        <div className="space-y-2">
                          <Label>Anexar Imagens da Solução</Label>
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('solution-image-upload')?.click()}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Adicionar Fotos
                            </Button>
                            <input
                              id="solution-image-upload"
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                            {solutionImages.length > 0 && (
                              <span className="text-sm text-muted-foreground">
                                {solutionImages.length} foto(s) adicionada(s)
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {solutionImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {solutionImages.map((img, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={img}
                                alt={`Solução ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border"
                              />
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>

            {canEdit && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                {status === TicketStatus.COMPLETED ? (
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fechando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Fechar Chamado
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}