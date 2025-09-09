import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Upload, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoryLabels, priorityLabels } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { ticketsService } from '@/services/tickets.service';
import { hotelsService } from '@/services/hotels.service';

export default function NewTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userHotelId, setUserHotelId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    roomNumber: '',
    category: TicketCategory.OTHER as TicketCategory,
    priority: TicketPriority.MEDIUM as TicketPriority,
    title: '',
    description: '',
    images: [] as string[]
  });

  useEffect(() => {
    const loadUserHotel = async () => {
      if (user) {
        try {
          const hotels = await hotelsService.getUserHotels(user.id);
          if (hotels.length > 0) {
            setUserHotelId(hotels[0].hotel_id);
          }
        } catch (error) {
          console.error('Error loading user hotel:', error);
        }
      }
    };
    loadUserHotel();
  }, [user]);

  if (!user || user.role !== UserRole.RECEPCAO) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userHotelId) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar vinculado a um hotel para criar chamados.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await ticketsService.create({
        room_number: formData.roomNumber,
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        hotel_id: userHotelId,
        creator_id: user.id,
      });

      toast({
        title: 'Chamado criado com sucesso',
        description: `Chamado para o quarto ${formData.roomNumber} foi criado.`,
      });
      
      navigate('/tickets');
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Erro ao criar chamado',
        description: error.message || 'Ocorreu um erro ao criar o chamado.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, upload to server and get URLs
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
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
              Novo Chamado
            </h1>
            <p className="text-muted-foreground">
              Crie um novo chamado de manutenção
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Chamado</CardTitle>
            <CardDescription>
              Preencha os detalhes do problema que precisa ser resolvido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Número do Quarto/Área*</Label>
                  <Input
                    id="roomNumber"
                    placeholder="Ex: 201, Recepção, Piscina"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria*</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as TicketCategory }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="category">
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

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade*</Label>
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
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título*</Label>
                  <Input
                    id="title"
                    placeholder="Breve descrição do problema"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Detalhada*</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  disabled={isSubmitting}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">Fotos (opcional)</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Adicionar Fotos
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isSubmitting}
                  />
                  {formData.images.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {formData.images.length} foto(s) adicionada(s)
                    </span>
                  )}
                </div>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }))}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isSubmitting}
                      >
                        ×
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
                      Criando...
                    </>
                  ) : (
                    'Abrir Chamado'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/tickets')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}