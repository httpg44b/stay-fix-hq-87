import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { 
  Upload, X, Save, CheckCircle, Loader2, Calendar, User, MapPin, 
  FileText, Building, ImageIcon, Eye, Download, UserCheck 
} from 'lucide-react';
import { TicketStatus, statusLabels, categoryLabels, UserRole } from '@/lib/constants';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { storageService } from '@/services/storage.service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR, fr } from 'date-fns/locale';
import { TechnicianName } from '@/components/TechnicianName';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface TicketModalProps {
  ticketId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function TicketModal({ ticketId, isOpen, onClose, onUpdate }: TicketModalProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [hotel, setHotel] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [solution, setSolution] = useState('');
  const [status, setStatus] = useState<TicketStatus>(TicketStatus.NEW);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [solutionImages, setSolutionImages] = useState<string[]>([]);
  const [ticketImages, setTicketImages] = useState<string[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

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
      setSelectedTechnician(data.assignee_id || '');
      setSolutionImages(data.solution_images || []);
      setTicketImages(data.images || []);
      
      // Load hotel info
      if (data.hotel_id) {
        const hotelData = await hotelsService.getById(data.hotel_id);
        setHotel(hotelData);
        
        // Load technicians for this hotel (admin only)
        if (user?.role === UserRole.ADMIN) {
          const { data: techData, error: techError } = await supabase
            .rpc('get_hotel_technicians', { _hotel_id: data.hotel_id });
          
          if (!techError && techData) {
            setTechnicians(techData);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      toast({
        title: t('errors.loadingTicket'),
        description: error.message || t('errors.loadingTicketDesc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSolution: boolean = false) => {
    const files = e.target.files;
    if (!files || !ticketId) return;

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: t('errors.fileTooLarge'),
            description: `${file.name} ${t('errors.exceedsLimit')}`,
            variant: 'destructive',
          });
          continue;
        }

        const url = await storageService.uploadTicketImage(file, ticketId);
        uploadedUrls.push(url);
      }

      if (isSolution) {
        setSolutionImages(prev => [...prev, ...uploadedUrls]);
      } else {
        const updatedImages = [...ticketImages, ...uploadedUrls];
        setTicketImages(updatedImages);
        
        // Update ticket with new images immediately
        await ticketsService.update(ticketId, { images: updatedImages });
      }

      toast({
        title: t('common.imagesUploaded'),
        description: `${uploadedUrls.length} ${t('common.imagesUploadedDesc')}`,
      });
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: t('errors.uploadingImages'),
        description: error.message || t('errors.uploadingImagesDesc'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (url: string, isSolution: boolean = false) => {
    try {
      await storageService.deleteTicketImage(url);
      
      if (isSolution) {
        setSolutionImages(prev => prev.filter(img => img !== url));
      } else {
        const updatedImages = ticketImages.filter(img => img !== url);
        setTicketImages(updatedImages);
        
        if (ticketId) {
          await ticketsService.update(ticketId, { images: updatedImages });
        }
      }
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: t('errors.removingImage'),
        description: t('errors.removingImageDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    // Validations
    if (status === TicketStatus.COMPLETED) {
      // Se um técnico está marcando como concluído, atribui automaticamente a ele
      if (user?.role === UserRole.TECNICO) {
        if (!solution) {
          toast({
            title: t('ticket.solutionRequired'),
            description: t('ticket.solutionRequiredDesc'),
            variant: 'destructive',
          });
          return;
        }
        // Atribuir automaticamente ao técnico atual
        if (user?.id) {
          setSelectedTechnician(user.id);
        }
      }
      
      if (user?.role === UserRole.TECNICO || (user?.role === UserRole.ADMIN && solution)) {
        setShowCloseConfirm(true);
        return;
      }
      
      if (user?.role === UserRole.ADMIN && !solution) {
        setShowCloseConfirm(true);
        return;
      }
    }
    
    performSave();
  };

  const performSave = async () => {
    try {
      setSaving(true);
      
      const updateData: any = {
        status,
        solution,
        solution_images: solutionImages,
        ...(status === TicketStatus.COMPLETED && { closed_at: new Date().toISOString() })
      };
      
      // Admin can change technician
      if (user?.role === UserRole.ADMIN && selectedTechnician !== ticket.assignee_id) {
        updateData.assignee_id = selectedTechnician || null;
      }
      
      // Se técnico está fechando, atribui automaticamente a ele
      if (status === TicketStatus.COMPLETED && user?.role === UserRole.TECNICO && user?.id) {
        updateData.assignee_id = user.id;
      }
      
      await ticketsService.update(ticket.id, updateData);

      toast({
        title: t('ticket.updated'),
        description: t('ticket.updatedDesc'),
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: t('errors.updatingTicket'),
        description: error.message || t('errors.updatingTicketDesc'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setShowCloseConfirm(false);
    }
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageViewerOpen(true);
  };

  const canEdit = user?.role === UserRole.ADMIN || 
                   user?.role === UserRole.TECNICO ||
                   (user?.role === UserRole.RECEPCAO && ticket?.creator_id === user?.id);

  const canChangeTechnician = user?.role === UserRole.ADMIN;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
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
                    {t(`category.${ticket.category.toLowerCase()}`)}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-6">
                  {/* Ticket Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('common.room_area')}:</span>
                        <span className="font-medium">{ticket.room_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('tickets.hotel')}:</span>
                        <span className="font-medium">{hotel?.name || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('tickets.createdAt')}:</span>
                        <span className="font-medium">
                          {format(new Date(ticket.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: language === 'fr' ? fr : ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('tickets.technician')}:</span>
                        <span className="font-medium">
                          <TechnicianName assigneeId={ticket.assignee_id} />
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('ticket.description')}
                      </Label>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Ticket Images */}
                    {(ticketImages.length > 0 || canEdit) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            {t('ticket.ticketImages')}
                          </Label>
                          
                          {ticketImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {ticketImages.map((img, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={img}
                                    alt={`${t('common.image')} ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => openImageViewer(img)}
                                  />
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => removeImage(img, false)}
                                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openImageViewer(img);
                                    }}
                                    className="absolute bottom-1 left-1 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {canEdit && (
                            <div className="flex items-center gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploading}
                                onClick={() => document.getElementById('ticket-image-upload')?.click()}
                              >
                                {uploading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="mr-2 h-4 w-4" />
                                )}
                                {t('common.add_images')}
                              </Button>
                              <input
                                id="ticket-image-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, false)}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Status and Technician Update */}
                    {canEdit && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="status">{t('ticket.status')}</Label>
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
                          
                          {canChangeTechnician && (
                            <div className="space-y-2">
                              <Label htmlFor="technician">
                                <UserCheck className="inline h-4 w-4 mr-1" />
                                {t('ticket.assignee')}
                              </Label>
                              <Select value={selectedTechnician || "unassigned"} onValueChange={(value) => setSelectedTechnician(value === "unassigned" ? "" : value)}>
                                <SelectTrigger id="technician">
                                  <SelectValue placeholder={t('ticket.selectTechnician')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">{t('common.unassigned')}</SelectItem>
                                  {technicians.map((tech) => (
                                    <SelectItem key={tech.id} value={tech.id}>
                                      {tech.display_name} ({tech.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
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
                            {t('ticket.solution')}
                          </Label>
                          {canEdit ? (
                            <Textarea
                              id="solution"
                              placeholder="Décrivez la solution appliquée ou l'avancement de l'appel..."
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
                            <Label>Joindre des images de la solution</Label>
                            <div className="flex items-center gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploading}
                                onClick={() => document.getElementById('solution-image-upload')?.click()}
                              >
                                {uploading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="mr-2 h-4 w-4" />
                                )}
                                {t('ticket.add_solution_images')}
                              </Button>
                              <input
                                id="solution-image-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, true)}
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
                                  className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => openImageViewer(img)}
                                />
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => removeImage(img, true)}
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

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Fechamento</AlertDialogTitle>
            <AlertDialogDescription>
              {user?.role === UserRole.ADMIN && !solution
                ? 'Você está fechando este chamado sem uma solução. Deseja continuar?'
                : 'Tem certeza que deseja fechar este chamado? Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performSave}>
              Confirmar Fechamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar Imagem</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={selectedImage}
              alt="Imagem ampliada"
              className="w-full h-auto rounded-lg"
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => window.open(selectedImage, '_blank')}
            >
              <Download className="mr-2 h-4 w-4" />
              Abrir Original
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}