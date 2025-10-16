import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { checklistsService, Checklist, ChecklistStatus } from '@/services/checklists.service';
import { hotelsService, Hotel } from '@/services/hotels.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, CheckCircle2, Clock, Circle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
      const [checklistsData, hotelsData] = await Promise.all([
        checklistsService.getAll(selectedHotel !== 'all' ? selectedHotel : undefined),
        hotelsService.getAll(),
      ]);
      setChecklists(checklistsData);
      setHotels(hotelsData);
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
        await checklistsService.create({
          title: formData.title,
          description: formData.description,
          hotel_id: formData.hotel_id,
          status: formData.status,
        });
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

  const getStatusIcon = (status: ChecklistStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: ChecklistStatus) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'in_progress':
        return 'En cours';
      default:
        return 'En attente';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Listes de contrôle</h1>
          <p className="text-muted-foreground">Gérez vos listes de tâches</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle liste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChecklist ? 'Modifier la liste' : 'Nouvelle liste de contrôle'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
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

              <div>
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as ChecklistStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
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

      <div className="flex gap-4">
        <Select value={selectedHotel} onValueChange={setSelectedHotel}>
          <SelectTrigger className="w-[200px]">
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {checklists.map((checklist) => {
          const hotel = hotels.find((h) => h.id === checklist.hotel_id);
          return (
            <Card key={checklist.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{checklist.title}</CardTitle>
                    <CardDescription className="mt-1">{hotel?.name}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(checklist)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteChecklistId(checklist.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {checklist.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {checklist.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {getStatusIcon(checklist.status)}
                  <Select
                    value={checklist.status}
                    onValueChange={(value) => handleStatusChange(checklist.id, value as ChecklistStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="completed">Terminée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {checklists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucune liste de contrôle trouvée</p>
        </div>
      )}

      <AlertDialog open={!!deleteChecklistId} onOpenChange={() => setDeleteChecklistId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette liste ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
