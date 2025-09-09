import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { hotelsService, type Hotel, type CreateHotelInput, type UpdateHotelInput } from '@/services/hotels.service';
import { usersService, type User } from '@/services/users.service';
import { Plus, Pencil, Trash2, Search, Building2, MapPin, Phone, Mail, FileText, Users, UserPlus } from 'lucide-react';
import { HotelUsersList } from '@/components/hotel/HotelUsersList';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/contexts/LanguageContext';

export function Hotels() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [selectedHotelForUsers, setSelectedHotelForUsers] = useState<Hotel | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [hotelUsers, setHotelUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    cnpj: '',
    is_active: true
  });

  useEffect(() => {
    loadHotels();
    loadUsers();
  }, []);

  const loadHotels = async () => {
    try {
      setLoading(true);
      const data = await hotelsService.getAll();
      setHotels(data);
    } catch (error) {
      toast({
        title: 'Erro ao carregar hotéis',
        description: 'Não foi possível carregar a lista de hotéis.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await usersService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadHotelUsers = async (hotelId: string) => {
    try {
      setLoadingUsers(true);
      const data = await hotelsService.getHotelUsers(hotelId);
      setHotelUsers(data);
      setSelectedUsers(data.map(hu => hu.user_id));
    } catch (error) {
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar os usuários do hotel.',
        variant: 'destructive'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleManageUsers = async (hotel: Hotel) => {
    setSelectedHotelForUsers(hotel);
    setIsManageUsersOpen(true);
    await loadHotelUsers(hotel.id);
  };

  const handleSaveUsers = async () => {
    if (!selectedHotelForUsers) return;

    try {
      setLoadingUsers(true);
      
      // Get current users
      const currentUsers = hotelUsers.map(hu => hu.user_id);
      
      // Find users to add and remove
      const usersToAdd = selectedUsers.filter(userId => !currentUsers.includes(userId));
      const usersToRemove = currentUsers.filter(userId => !selectedUsers.includes(userId));
      
      // Remove users
      for (const userId of usersToRemove) {
        await hotelsService.removeUser(userId, selectedHotelForUsers.id);
      }
      
      // Add users
      for (const userId of usersToAdd) {
        await hotelsService.assignUser(userId, selectedHotelForUsers.id);
      }
      
      toast({
        title: 'Sucesso',
        description: 'Usuários do hotel atualizados com sucesso!'
      });
      
      setIsManageUsersOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar usuários',
        description: error.message || 'Ocorreu um erro ao atualizar os usuários do hotel.',
        variant: 'destructive'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingHotel) {
        // Update existing hotel
        const updateData: UpdateHotelInput = {
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          cnpj: formData.cnpj || undefined,
          is_active: formData.is_active
        };

        await hotelsService.update(editingHotel.id, updateData);
        toast({
          title: 'Hotel atualizado',
          description: 'Hotel atualizado com sucesso!'
        });
      } else {
        // Create new hotel
        const createData: CreateHotelInput = {
          name: formData.name,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          cnpj: formData.cnpj || undefined,
          is_active: formData.is_active
        };

        await hotelsService.create(createData);
        toast({
          title: 'Hotel criado',
          description: 'Hotel criado com sucesso!'
        });
      }

      await loadHotels();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar hotel',
        description: error.message || 'Ocorreu um erro ao salvar o hotel.',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      address: hotel.address || '',
      phone: hotel.phone || '',
      email: hotel.email || '',
      cnpj: hotel.cnpj || '',
      is_active: hotel.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (hotel: Hotel) => {
    if (!confirm(`Tem certeza que deseja excluir o hotel "${hotel.name}"?`)) {
      return;
    }

    setIsDeleting(hotel.id);
    try {
      await hotelsService.delete(hotel.id);
      toast({
        title: 'Hotel excluído',
        description: 'Hotel excluído com sucesso!'
      });
      await loadHotels();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir hotel',
        description: error.message || 'Ocorreu um erro ao excluir o hotel.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (hotel: Hotel) => {
    try {
      await hotelsService.toggleActive(hotel.id);
      toast({
        title: hotel.is_active ? 'Hotel desativado' : 'Hotel ativado',
        description: `Hotel ${hotel.is_active ? 'desativado' : 'ativado'} com sucesso!`
      });
      await loadHotels();
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar status',
        description: error.message || 'Ocorreu um erro ao alterar o status do hotel.',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      cnpj: '',
      is_active: true
    });
    setEditingHotel(null);
  };

  const filteredHotels = hotels.filter(hotel => {
    const searchLower = searchQuery.toLowerCase();
    return (
      hotel.name.toLowerCase().includes(searchLower) ||
      hotel.address?.toLowerCase().includes(searchLower) ||
      hotel.cnpj?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {t('nav.hotels')}
            </CardTitle>
            <CardDescription>
              {t('hotel.subtitle')}
            </CardDescription>
          </div>
          <Button onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('hotel.newHotel')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('hotel.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('hotel.name')}</TableHead>
                  <TableHead>{t('hotel.address')}</TableHead>
                  <TableHead>{t('common.contact')}</TableHead>
                  <TableHead>{t('hotel.cnpj')}</TableHead>
                  <TableHead>{t('user.status')}</TableHead>
                  <TableHead>{t('hotel.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : filteredHotels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t('hotel.noHotels')}
                    </TableCell>
                </TableRow>
              ) : (
                filteredHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {hotel.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hotel.address ? (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {hotel.address}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {hotel.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {hotel.phone}
                          </div>
                        )}
                        {hotel.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {hotel.email}
                          </div>
                        )}
                        {!hotel.phone && !hotel.email && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {hotel.cnpj ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {hotel.cnpj}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={hotel.is_active ? 'default' : 'secondary'}>
                        {hotel.is_active ? t('hotel.active') : t('hotel.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(hotel.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManageUsers(hotel)}
                          title={t('hotel.manageUsers')}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(hotel)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(hotel)}
                        >
                          {hotel.is_active ? (
                            <Building2 className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Building2 className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(hotel)}
                          disabled={isDeleting === hotel.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingHotel ? t('hotel.editHotel') : t('hotel.newHotel')}
              </DialogTitle>
              <DialogDescription>
                {editingHotel 
                  ? t('hotel.editHotelDesc') 
                  : t('hotel.newHotelDesc')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ/SIREN</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="Digite o CNPJ (Brasil) ou SIREN (França)"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingHotel ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para gerenciar usuários do hotel */}
      <Dialog open={isManageUsersOpen} onOpenChange={setIsManageUsersOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciar Usuários - {selectedHotelForUsers?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione os usuários que terão acesso a este hotel
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {loadingUsers ? (
              <div className="text-center py-8">Carregando usuários...</div>
            ) : (
              <HotelUsersList
                users={users}
                selectedUsers={selectedUsers}
                onToggleUser={(userId, selected) => {
                  if (selected) {
                    setSelectedUsers([...selectedUsers, userId]);
                  } else {
                    setSelectedUsers(selectedUsers.filter(id => id !== userId));
                  }
                }}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManageUsersOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveUsers}
              disabled={loadingUsers}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Salvar Usuários
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function HotelsPage() {
  return (
    <AppLayout>
      <Hotels />
    </AppLayout>
  );
}