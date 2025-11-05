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
import { Input } from '@/components/ui/input';
import { 
  Upload, X, Save, CheckCircle, Loader2, Calendar, User, MapPin, 
  FileText, Building, ImageIcon, Eye, Download, UserCheck, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { TicketStatus, statusLabels, categoryLabels, UserRole, TicketPriority, priorityLabels } from '@/lib/constants';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { storageService } from '@/services/storage.service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR, fr } from 'date-fns/locale';
import { TechnicianName } from '@/components/TechnicianName';
import { usersService } from '@/services/users.service';
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);
  // States for editing all fields (admin only)
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);
  const [editHotelId, setEditHotelId] = useState('');
  const [hotels, setHotels] = useState<any[]>([]);
  const [creatorInfo, setCreatorInfo] = useState<{ name: string; email: string } | null>(null);
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM);

  useEffect(() => {
    if (ticketId && isOpen) {
      loadTicket();
    }
  }, [ticketId, isOpen]);

  const loadTechniciansForHotel = async (hotelId: string) => {
    if (!hotelId || user?.role !== UserRole.ADMIN) return;
    
    try {
      const { data: techData, error: techError } = await supabase
        .rpc('get_hotel_technicians', { _hotel_id: hotelId });
      
      if (!techError && techData) {
        setTechnicians(techData);
        // Reset selected technician if not from this hotel
        if (selectedTechnician && !techData.find((t: any) => t.id === selectedTechnician)) {
          setSelectedTechnician('');
        }
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const loadTicket = async () => {
    if (!ticketId) return;
    
    try {
      setLoading(true);
      setCreatorInfo(null); // Reset creator info
      const data = await ticketsService.getById(ticketId);
      setTicket(data);
      setSolution(data.solution || '');
      setStatus(data.status);
      setSelectedTechnician(data.assignee_id || '');
      setSolutionImages(data.solution_images || []);
      setTicketImages(data.images || []);
      setPriority(data.priority || TicketPriority.MEDIUM);
      // Initialize edit fields
      setEditTitle(data.title || '');
      setEditDescription(data.description || '');
      setEditCategory(data.category || '');
      setEditRoomNumber(data.room_number || '');
      setEditPriority(data.priority || TicketPriority.MEDIUM);
      setEditHotelId(data.hotel_id || '');
      
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
      
      // Load all hotels for admin
      if (user?.role === UserRole.ADMIN) {
        try {
          const hotelsList = await hotelsService.getAll();
          setHotels(hotelsList);
        } catch (error) {
          console.error('Error loading hotels:', error);
        }
      }
      
      // Fetch creator info
      if (data.creator_id) {
        try {
          const creatorUser = await usersService.getById(data.creator_id);
          setCreatorInfo({ name: creatorUser.display_name, email: creatorUser.email });
        } catch (error) {
          console.error('Error loading creator info:', error);
          setCreatorInfo(null);
        }
      } else {
        setCreatorInfo(null);
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
      
      // Validate file sizes
      const filesArray = Array.from(files);
      const validFiles = filesArray.filter(file => {
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        
        if (file.size > maxSize) {
          toast({
            title: t('errors.fileTooLarge'),
            description: `${file.name} ${t('errors.exceedsLimit')}`,
            variant: 'destructive',
          });
          return false;
        }
        return true;
      });

      // Upload all files in parallel
      const uploadPromises = validFiles.map(file =>
        storageService.uploadTicketImage(file, ticketId)
          .catch(error => {
            console.error('Error uploading file:', error);
            return null;
          })
      );

      const uploadResults = await Promise.all(uploadPromises);
      const uploadedUrls = uploadResults.filter((url): url is string => url !== null);

      if (isSolution) {
        setSolutionImages(prev => [...prev, ...uploadedUrls]);
      } else {
        const updatedImages = [...ticketImages, ...uploadedUrls];
        setTicketImages(updatedImages);
        
        // Update ticket with new images immediately
        await ticketsService.update(ticketId, { images: updatedImages });
      }

      // Show success message in French
      const hasVideos = Array.from(files).some(f => f.type.startsWith('video/'));
      const hasImages = Array.from(files).some(f => f.type.startsWith('image/'));
      
      if (hasVideos && hasImages) {
        toast({
          title: "Médias téléchargés",
          description: "Les vidéos et images ont été téléchargées avec succès",
        });
      } else if (hasVideos) {
        toast({
          title: "Vidéo téléchargée",
          description: "La vidéo a été téléchargée avec succès",
        });
      } else {
        toast({
          title: "Image téléchargée",
          description: "L'image a été téléchargée avec succès",
        });
      }
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
      
      // Admin and Reception can change priority
      if ((user?.role === UserRole.ADMIN || user?.role === UserRole.RECEPCAO) && priority !== ticket.priority) {
        updateData.priority = priority;
      }
      
      // Admin can change all fields
      if (user?.role === UserRole.ADMIN && editMode) {
        updateData.title = editTitle;
        updateData.description = editDescription;
        updateData.category = editCategory;
        updateData.room_number = editRoomNumber;
        updateData.priority = editPriority;
        updateData.hotel_id = editHotelId;
      }
      
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
    const images = [...ticketImages, ...solutionImages];
    setAllImages(images);
    const index = images.findIndex(img => img === imageUrl);
    setCurrentImageIndex(index >= 0 ? index : 0);
    setSelectedImage(imageUrl);
    setImageViewerOpen(true);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (allImages.length === 0) return;
    
    let newIndex = currentImageIndex;
    if (direction === 'prev') {
      newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : allImages.length - 1;
    } else {
      newIndex = currentImageIndex < allImages.length - 1 ? currentImageIndex + 1 : 0;
    }
    
    setCurrentImageIndex(newIndex);
    setSelectedImage(allImages[newIndex]);
  };

  const canEdit = user?.role === UserRole.ADMIN || 
                   user?.role === UserRole.TECNICO ||
                   (user?.role === UserRole.RECEPCAO && ticket?.creator_id === user?.id);

  const canChangeTechnician = user?.role === UserRole.ADMIN;
  
  const canChangePriority = user?.role === UserRole.ADMIN || user?.role === UserRole.RECEPCAO;

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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {user?.role === UserRole.ADMIN && editMode ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-xl font-semibold"
                      />
                    ) : (
                      <DialogTitle className="text-xl">{ticket.title}</DialogTitle>
                    )}
                  </div>
                  {user?.role === UserRole.ADMIN && !editMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      {t('common.edit')}
                    </Button>
                  )}
                </div>
                <DialogDescription className="flex items-center gap-4 mt-2">
                  {user?.role === UserRole.ADMIN && editMode ? (
                    <div className="flex gap-2 w-full">
                      <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus)}>
                        <SelectTrigger className="w-[150px]">
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
                      <Select value={editPriority} onValueChange={(value) => setEditPriority(value as TicketPriority)}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      <Badge variant="outline">
                        {t(`category.${ticket.category.toLowerCase()}`)}
                      </Badge>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-6">
                  {/* Ticket Details */}
                  <div className="space-y-4">
                    {/* Mobile layout for ticket details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('common.room_area')}:</span>
                        </div>
                        {user?.role === UserRole.ADMIN && editMode ? (
                          <Input
                            value={editRoomNumber}
                            onChange={(e) => setEditRoomNumber(e.target.value)}
                            className="h-7"
                          />
                        ) : (
                          <span className="font-medium">{ticket.room_number}</span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('tickets.hotel')}:</span>
                        </div>
                        {user?.role === UserRole.ADMIN && editMode ? (
                          <Select value={editHotelId} onValueChange={(value) => {
                            setEditHotelId(value);
                            // Reload technicians for new hotel
                            loadTechniciansForHotel(value);
                          }}>
                            <SelectTrigger className="h-7 w-full sm:w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {hotels.map((h) => (
                                <SelectItem key={h.id} value={h.id}>
                                  {h.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-medium">{hotel?.name || '-'}</span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('tickets.createdAt')}:</span>
                        </div>
                        <span className="font-medium text-sm sm:text-base">
                          {format(new Date(ticket.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: language === 'fr' ? fr : ptBR })}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('tickets.createdBy')}:</span>
                        </div>
                        <span className="font-medium">
                          {creatorInfo ? `${creatorInfo.name} (${creatorInfo.email})` : t('common.loading')}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t('tickets.technician')}:</span>
                        </div>
                        {user?.role === UserRole.ADMIN && editMode ? (
                          <Select 
                            value={selectedTechnician || "unassigned"} 
                            onValueChange={(value) => setSelectedTechnician(value === "unassigned" ? "" : value)}
                          >
                            <SelectTrigger className="h-7 w-[180px]">
                              <SelectValue placeholder={t('tickets.selectTechnician')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                {t('tickets.noTechnician')}
                              </SelectItem>
                              {technicians.map((tech) => (
                                <SelectItem key={tech.id} value={tech.id}>
                                  {tech.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="font-medium">
                            <TechnicianName assigneeId={ticket.assignee_id} />
                          </span>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('ticket.description')}
                      </Label>
                      {user?.role === UserRole.ADMIN && editMode ? (
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={4}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                          {ticket.description}
                        </p>
                      )}
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
                                {ticketImages.map((media, index) => {
                                const isVideo = media.match(/\.(mp4|webm|ogg|mov|m4v|avi|wmv|flv|mkv|3gp)$/i);
                                
                                return (
                                  <div key={index} className={`relative group ${isVideo ? 'col-span-3' : ''}`}>
                                    {isVideo ? (
                                      <div className="relative">
                                        <video
                                          key={media}
                                          className="w-full h-80 object-contain bg-black rounded-lg border"
                                          controls
                                          playsInline
                                          muted={false}
                                          preload="metadata"
                                          onClick={(e) => e.stopPropagation()}
                                          onError={(e) => {
                                            console.error('Video playback error:', e);
                                            const video = e.currentTarget;
                                            // Try alternative loading method
                                            video.load();
                                          }}
                                        >
                                          <source src={media} type="video/mp4" />
                                          <source src={media} type="video/webm" />
                                          <source src={media} type="video/ogg" />
                                          <source src={media} />
                                          Seu navegador não suporta a reprodução de vídeos.
                                        </video>
                                        <div className="absolute top-2 right-2 flex gap-2">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(media, '_blank');
                                            }}
                                            className="bg-black/50 text-white rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Abrir em nova aba"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <a
                                            href={media}
                                            download
                                            className="bg-black/50 text-white rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                            title="Baixar vídeo"
                                          >
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </div>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeImage(media, false);
                                            }}
                                            className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <>
                                        <img
                                          src={media}
                                          alt={`${t('common.image')} ${index + 1}`}
                                          className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => openImageViewer(media)}
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openImageViewer(media);
                                          }}
                                          className="absolute bottom-1 left-1 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => removeImage(media, false)}
                                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
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
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  handleImageUpload(e, false);
                                  // Reset input to allow uploading the same file again
                                  if (e.target) {
                                    e.target.value = '';
                                  }
                                }}
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
                          
                          {canChangePriority && (
                            <div className="space-y-2">
                              <Label htmlFor="priority">{t('ticket.priority')}</Label>
                              <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority)}>
                                <SelectTrigger id="priority">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(priorityLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
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
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  handleImageUpload(e, true);
                                  // Reset input to allow uploading the same file again
                                  if (e.target) {
                                    e.target.value = '';
                                  }
                                }}
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
                            {solutionImages.map((media, index) => {
                              const isVideo = media.match(/\.(mp4|webm|ogg|mov|m4v|avi|wmv|flv|mkv|3gp)$/i);
                              
                              return (
                                <div key={index} className={`relative group ${isVideo ? 'col-span-3' : ''}`}>
                                  {isVideo ? (
                                    <div className="relative">
                                      <video
                                        key={media}
                                        className="w-full h-80 object-contain bg-black rounded-lg border"
                                        controls
                                        playsInline
                                        muted={false}
                                        preload="metadata"
                                        onClick={(e) => e.stopPropagation()}
                                        onError={(e) => {
                                          console.error('Solution video playback error:', e);
                                          const video = e.currentTarget;
                                          video.load();
                                        }}
                                      >
                                        <source src={media} type="video/mp4" />
                                        <source src={media} type="video/webm" />
                                        <source src={media} type="video/ogg" />
                                        <source src={media} />
                                        Seu navegador não suporta a reprodução de vídeos.
                                      </video>
                                      <div className="absolute top-2 right-2 flex gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(media, '_blank');
                                          }}
                                          className="bg-black/50 text-white rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Abrir em nova aba"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                        <a
                                          href={media}
                                          download
                                          className="bg-black/50 text-white rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => e.stopPropagation()}
                                          title="Baixar vídeo"
                                        >
                                          <Download className="h-4 w-4" />
                                        </a>
                                      </div>
                                      {canEdit && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeImage(media, true);
                                          }}
                                          className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <img
                                      src={media}
                                      alt={`Solução ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => openImageViewer(media)}
                                    />
                                  )}
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => removeImage(media, true)}
                                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {canEdit && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {user?.role === UserRole.ADMIN && editMode && (
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      {t('common.cancel')}
                    </Button>
                  )}
                  {!editMode && (
                    <Button variant="outline" onClick={onClose}>
                      {t('common.cancel')}
                    </Button>
                  )}
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
                          Fermer Appel
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
                          Enregistrer les modifications
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
            <DialogTitle>
              Visualizar Imagem {allImages.length > 1 && `(${currentImageIndex + 1}/${allImages.length})`}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            {selectedImage.includes('.mp4') || selectedImage.includes('.webm') || selectedImage.includes('.ogg') || selectedImage.includes('.mov') ? (
              <video
                src={selectedImage}
                controls
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <img
                src={selectedImage}
                alt="Imagem ampliada"
                className="w-full h-auto rounded-lg"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => window.open(selectedImage, '_blank')}
            >
              <Download className="mr-2 h-4 w-4" />
              Abrir Original
            </Button>
            
            {/* Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}