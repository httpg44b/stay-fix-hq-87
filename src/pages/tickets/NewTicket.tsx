import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserRole, TicketCategory, TicketPriority } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoryLabels, priorityLabels } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';
import { storageService } from '@/services/storage.service';
import { v4 as uuidv4 } from 'uuid';

export default function NewTicket() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userHotelId, setUserHotelId] = useState<string | null>(null);
  const [availableHotels, setAvailableHotels] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    roomNumber: '',
    category: TicketCategory.OTHER as TicketCategory,
    priority: TicketPriority.MEDIUM as TicketPriority,
    title: '',
    description: '',
    images: [] as string[],
    imageFiles: [] as File[],
    videos: [] as string[],
    videoFiles: [] as File[]
  });

  useEffect(() => {
    const loadUserHotel = async () => {
      if (user) {
        try {
          // Admin can choose any hotel, so we'll need to handle this differently
          if (user.role === UserRole.ADMIN) {
            // For admin, we'll get all hotels and use the first one as default
            const allHotels = await hotelsService.getAll();
            
            // Ordenar hotéis na ordem específica
            const hotelOrder = [
              'Hotel du Danube',
              'Hotel Vandome Saint-Germain',
              'Fauchon l\'hotel paris',
              'Hotel L de Lutèce'
            ];
            
            const sortedHotels = allHotels.sort((a, b) => {
              const indexA = hotelOrder.indexOf(a.name);
              const indexB = hotelOrder.indexOf(b.name);
              
              // Se ambos estão na lista, ordenar pela posição
              if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
              }
              // Se apenas A está na lista, vem primeiro
              if (indexA !== -1) return -1;
              // Se apenas B está na lista, vem primeiro
              if (indexB !== -1) return 1;
              // Se nenhum está na lista, ordenar alfabeticamente
              return a.name.localeCompare(b.name);
            });
            
            setAvailableHotels(sortedHotels);
            if (sortedHotels.length > 0) {
              setUserHotelId(sortedHotels[0].id);
            }
          } else {
            const hotels = await hotelsService.getUserHotels(user.id);
            if (hotels.length > 0) {
              setUserHotelId(hotels[0].hotel_id);
            }
          }
        } catch (error) {
          console.error('Error loading user hotel:', error);
        }
      }
    };
    loadUserHotel();
  }, [user]);

  if (!user || (user.role !== UserRole.RECEPCAO && user.role !== UserRole.ADMIN)) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userHotelId) {
      toast({
        title: t('errors.error'),
        description: t('errors.needHotelLink'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a temporary ticket ID for image uploads
      const tempTicketId = uuidv4();
      
      // Upload images and videos first if any
      const uploadedMediaUrls: string[] = [];
      
      // Upload images
      if (formData.imageFiles.length > 0) {
        for (const file of formData.imageFiles) {
          try {
            const imageUrl = await storageService.uploadTicketMedia(file, tempTicketId);
            uploadedMediaUrls.push(imageUrl);
          } catch (uploadError) {
            console.error('Error uploading image:', uploadError);
            toast({
              title: t('errors.error'),
              description: t('errors.uploadingImage'),
              variant: 'destructive',
            });
          }
        }
      }
      
      // Upload videos
      if (formData.videoFiles.length > 0) {
        for (const file of formData.videoFiles) {
          try {
            const videoUrl = await storageService.uploadTicketMedia(file, tempTicketId);
            uploadedMediaUrls.push(videoUrl);
          } catch (uploadError: any) {
            console.error('Error uploading video:', uploadError);
            toast({
              title: t('errors.error'),
              description: uploadError.message || t('errors.uploadingVideo'),
              variant: 'destructive',
            });
          }
        }
      }

      await ticketsService.create({
        room_number: formData.roomNumber,
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        hotel_id: userHotelId,
        creator_id: user.id,
        images: uploadedMediaUrls,
      });

      toast({
        title: t('ticket.createdSuccess'),
        description: `${t('ticket.createdForRoom')} ${formData.roomNumber} ${t('ticket.wasCreated')}.`,
      });
      
      navigate('/tickets');
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: t('errors.creatingTicket'),
        description: error.message || t('errors.creatingTicketDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const imageFiles: File[] = [];
      const videoFiles: File[] = [];
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];
      
      newFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('video/')) {
          videoFiles.push(file);
          videoUrls.push(url);
        } else {
          imageFiles.push(file);
          imageUrls.push(url);
        }
      });
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...imageUrls],
        imageFiles: [...prev.imageFiles, ...imageFiles],
        videos: [...prev.videos, ...videoUrls],
        videoFiles: [...prev.videoFiles, ...videoFiles]
      }));
      
      // Show success message in French
      if (videoFiles.length > 0 && imageFiles.length > 0) {
        toast({
          title: "Médias téléchargés",
          description: "Les vidéos et images ont été téléchargées avec succès",
        });
      } else if (videoFiles.length > 0) {
        toast({
          title: "Vidéo téléchargée",
          description: "La vidéo a été téléchargée avec succès",
        });
      } else if (imageFiles.length > 0) {
        toast({
          title: "Image téléchargée",
          description: "L'image a été téléchargée avec succès",
        });
      }
      
      // Reset the input value to allow re-selection of the same file if needed
      e.target.value = '';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tickets')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t('tickets.newTicket')}
            </h1>
            <p className="text-muted-foreground">
              {t('ticket.createNewMaintenance')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('ticket.ticketInfo')}</CardTitle>
            <CardDescription>
              {t('ticket.fillDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {user.role === UserRole.ADMIN && availableHotels.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="hotel">{t('hotel.hotel')}*</Label>
                    <Select
                      value={userHotelId || ''}
                      onValueChange={(value) => setUserHotelId(value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="hotel">
                        <SelectValue placeholder={t('hotel.selectHotel')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableHotels.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">{t('ticket.roomAreaNumber')}*</Label>
                  <Input
                    id="roomNumber"
                    placeholder={t('ticket.roomAreaPlaceholder')}
                    value={formData.roomNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{t('ticket.category')}*</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as TicketCategory }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TicketCategory.CARPENTRY}>
                        {t('category.carpentry')}
                      </SelectItem>
                      <SelectItem value={TicketCategory.PAINTING}>
                        {t('category.painting')}
                      </SelectItem>
                      <SelectItem value={TicketCategory.FLOORING}>
                        {t('category.flooring')}
                      </SelectItem>
                      <SelectItem value={TicketCategory.PLUMBING}>
                        {t('category.plumbing')}
                      </SelectItem>
                      <SelectItem value={TicketCategory.ELECTRICAL}>
                        {t('category.electrical')}
                      </SelectItem>
                      <SelectItem value={TicketCategory.OTHER}>
                        {t('category.other')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">{t('ticket.priority')}*</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as TicketPriority }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {t(`priority.${value.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">{t('ticket.title')}*</Label>
                  <Input
                    id="title"
                    placeholder={t('ticket.titlePlaceholder')}
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('ticket.detailedDescription')}*</Label>
                <Textarea
                  id="description"
                  placeholder={t('ticket.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  disabled={isSubmitting}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="media">{t('ticket.photosVideos')} ({t('common.optional')})</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => document.getElementById('media-upload')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {t('ticket.addMedia')}
                  </Button>
                  <input
                    id="media-upload"
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/ogg,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={handleMediaUpload}
                    disabled={isSubmitting}
                  />
                  {(formData.images.length > 0 || formData.videos.length > 0) && (
                    <span className="text-sm text-muted-foreground">
                      {formData.images.length > 0 && `${formData.images.length} ${t('ticket.photosAdded')}`}
                      {formData.images.length > 0 && formData.videos.length > 0 && ', '}
                      {formData.videos.length > 0 && `${formData.videos.length} ${t('ticket.videosAdded')}`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('ticket.videoSizeLimit')}</p>
              </div>

              {(formData.images.length > 0 || formData.videos.length > 0) && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.images.map((img, index) => (
                    <div key={`img-${index}`} className="relative group">
                      <img
                        src={img}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index),
                          imageFiles: prev.imageFiles.filter((_, i) => i !== index)
                        }))}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {formData.videos.map((video, index) => (
                    <div key={`vid-${index}`} className="relative group">
                      <video
                        src={video}
                        className="w-full h-24 object-cover rounded-lg"
                        controls={false}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          videos: prev.videos.filter((_, i) => i !== index),
                          videoFiles: prev.videoFiles.filter((_, i) => i !== index)
                        }))}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.roomNumber || !formData.title || !formData.description}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.creating')}
                    </>
                  ) : (
                    t('ticket.openTicket')
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/tickets')}
                  disabled={isSubmitting}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}