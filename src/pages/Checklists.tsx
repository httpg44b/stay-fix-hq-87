import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { checklistsService, Checklist, ChecklistStatus } from '@/services/checklists.service';
import { hotelsService, Hotel } from '@/services/hotels.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChecklistCard } from '@/components/checklist/ChecklistCard';
import { AppLayout } from '@/components/layout/AppLayout';

export const Checklists = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<string>('all');
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [deleteChecklistId, setDeleteChecklistId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hotel_id: '',
    status: 'pending' as ChecklistStatus,
  });

  useEffect(() => {
    loadData();
  }, [selectedHotel]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [checklistsData, allHotelsData] = await Promise.all([
        checklistsService.getAll(selectedHotel !== 'all' ? selectedHotel : undefined),
        hotelsService.getAll(),
      ]);
      
      // Filter hotels based on user's linked hotels for non-admin users
      let filteredHotels = allHotelsData;
      if (user?.role !== 'ADMIN' && user?.id) {
        const userHotelsData = await hotelsService.getUserHotels(user.id);
        const userHotelIds = userHotelsData.map(h => h.hotel_id);
        filteredHotels = allHotelsData.filter(hotel => userHotelIds.includes(hotel.id));
      }
      
      setChecklists(checklistsData);
      setHotels(filteredHotels);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: t('error'),
        description: "Erreur lors du chargement des données",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.hotel_id) {
      toast({
        title: t('error'),
        description: "Veuillez remplir tous les champs obligatoires",
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingChecklist) {
        await checklistsService.update(editingChecklist.id, {
          title: formData.title,
          description: formData.description,
          status: formData.status,
        });
        toast({
          title: t('success'),
          description: "Liste mise à jour avec succès",
        });
      } else {
        const newChecklist = await checklistsService.create({
          title: formData.title,
          description: formData.description,
          hotel_id: formData.hotel_id,
          status: formData.status,
        });
        
        // Automatically set all rooms to 'not_verified' status (default)
        const { roomsService } = await import('@/services/rooms.service');
        const rooms = await roomsService.getByHotel(formData.hotel_id);
        const roomStatusPromises = rooms.map(room =>
          checklistsService.setRoomStatus(newChecklist.id, room.id, 'not_verified')
        );
        await Promise.all(roomStatusPromises);
        
        toast({
          title: t('success'),
          description: "Liste créée avec succès",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({
        title: t('error'),
        description: "Erreur lors de l'enregistrement",
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteChecklistId) return;

    try {
      await checklistsService.delete(deleteChecklistId);
      toast({
        title: t('success'),
        description: "Liste supprimée avec succès",
      });
      setDeleteChecklistId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast({
        title: t('error'),
        description: "Erreur lors de la suppression",
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: string, status: ChecklistStatus) => {
    try {
      await checklistsService.updateStatus(id, status);
      toast({
        title: t('success'),
        description: "Statut mis à jour",
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: t('error'),
        description: "Erreur lors de la mise à jour",
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      hotel_id: '',
      status: 'pending',
    });
    setEditingChecklist(null);
  };

  const openEditDialog = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    setFormData({
      title: checklist.title,
      description: checklist.description || '',
      hotel_id: checklist.hotel_id,
      status: checklist.status,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Listes de contrôle</h1>
            <p className="text-muted-foreground">Gérez vos listes de tâches</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle liste
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingChecklist ? 'Modifier la liste' : 'Nouvelle liste de contrôle'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Ex: Fermeture des portes"
                    />
                  </div>

                  {!editingChecklist && (
                    <div>
                      <Label htmlFor="hotel">Hôtel *</Label>
                      <Select
                        value={formData.hotel_id}
                        onValueChange={(value) => setFormData({ ...formData, hotel_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un hôtel" />
                        </SelectTrigger>
                        <SelectContent>
                          {hotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.id}>
                              {hotel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingChecklist ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Select value={selectedHotel} onValueChange={setSelectedHotel}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les hôtels</SelectItem>
            {hotels.map((hotel) => (
              <SelectItem key={hotel.id} value={hotel.id}>
                {hotel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {checklists.map((checklist) => {
            const hotel = hotels.find((h) => h.id === checklist.hotel_id);
            return (
              <ChecklistCard
                key={checklist.id}
                checklist={checklist}
                hotel={hotel}
                onEdit={() => openEditDialog(checklist)}
                onDelete={() => setDeleteChecklistId(checklist.id)}
                onUpdate={loadData}
              />
            );
          })}
        </div>

        {checklists.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-lg">Aucune liste de contrôle trouvée</p>
            <p className="text-muted-foreground text-sm mt-2">
              Créez votre première liste pour commencer
            </p>
          </div>
        )}

        <AlertDialog open={!!deleteChecklistId} onOpenChange={() => setDeleteChecklistId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cette liste et toutes ses tâches ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};
