import { useState } from 'react';
import { Checklist, ChecklistItem, checklistsService } from '@/services/checklists.service';
import { Hotel } from '@/services/hotels.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChecklistCardProps {
  checklist: Checklist;
  hotel?: Hotel;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

export const ChecklistCard = ({ checklist, hotel, onEdit, onDelete, onUpdate }: ChecklistCardProps) => {
  const { toast } = useToast();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');

  const completedCount = checklist.items?.filter(item => item.is_completed).length || 0;
  const totalCount = checklist.items?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggleItem = async (item: ChecklistItem) => {
    try {
      await checklistsService.toggleItem(item.id, !item.is_completed);
      toast({
        title: 'Succès',
        description: item.is_completed ? 'Tâche marquée comme non terminée' : 'Tâche terminée',
      });
      onUpdate();
    } catch (error) {
      console.error('Error toggling item:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour',
        variant: 'destructive',
      });
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;

    try {
      await checklistsService.addItem(checklist.id, { title: newItemTitle });
      setNewItemTitle('');
      setIsAddingItem(false);
      toast({
        title: 'Succès',
        description: 'Tâche ajoutée',
      });
      onUpdate();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Erreur',
        description: "Erreur lors de l'ajout",
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await checklistsService.deleteItem(itemId);
      toast({
        title: 'Succès',
        description: 'Tâche supprimée',
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{checklist.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{hotel?.name}</p>
            {checklist.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {checklist.description}
              </p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
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
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{completedCount}/{totalCount}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {checklist.items?.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center gap-2 group p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={item.is_completed}
                onCheckedChange={() => handleToggleItem(item)}
                className="shrink-0"
              />
              <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteItem(item.id)}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new item */}
        {isAddingItem ? (
          <div className="flex gap-2">
            <Input
              placeholder="Nouvelle tâche..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
                if (e.key === 'Escape') {
                  setIsAddingItem(false);
                  setNewItemTitle('');
                }
              }}
              autoFocus
              className="flex-1"
            />
            <Button onClick={handleAddItem} size="sm">
              Ajouter
            </Button>
            <Button 
              onClick={() => {
                setIsAddingItem(false);
                setNewItemTitle('');
              }} 
              variant="ghost" 
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingItem(true)}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une tâche
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
