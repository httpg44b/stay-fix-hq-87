import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usersService, type User, type CreateUserInput, type UpdateUserInput, type UserRole } from '@/services/users.service';
import { Plus, Pencil, Trash2, Search, UserCheck, UserX, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/contexts/LanguageContext';

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'RECEPCAO' as UserRole,
    locale: 'pt-BR',
    is_active: true
  });

  // Password change dialog state
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersService.getAll();
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Erreur lors du chargement des utilisateurs',
        description: "Impossible de charger la liste des utilisateurs.",
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUserForPassword(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'Mot de passe trop court',
        description: 'Le mot de passe doit contenir au moins 6 caractères.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Les mots de passe ne correspondent pas',
        description: 'Entrez le même mot de passe dans les deux champs.',
        variant: 'destructive'
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: selectedUserForPassword.id, newPassword: passwordForm.newPassword },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      
      if (error) {
        let errorMessage = "Impossible de modifier le mot de passe.";
        if (error.message) {
          try {
            const errorData = JSON.parse(error.message);
            errorMessage = errorData.error || errorData.message || error.message;
          } catch {
            errorMessage = error.message;
          }
        }
        throw new Error(errorMessage);
      }

      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error(data.error || "Erreur lors du changement du mot de passe");
      }

      toast({
        title: 'Mot de passe mis à jour',
        description: `Le mot de passe de ${selectedUserForPassword.display_name} a été modifié avec succès.`
      });
      setIsPasswordDialogOpen(false);
    } catch (err: any) {
      console.error('Password change error:', err);
      toast({
        title: "Erreur lors du changement du mot de passe",
        description: err.message || "Impossible de modifier le mot de passe.",
        variant: 'destructive'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData: UpdateUserInput = {
          display_name: formData.display_name,
          role: formData.role,
          locale: formData.locale,
          is_active: formData.is_active
        };
        
        await usersService.update(editingUser.id, updateData);
        toast({
          title: 'Utilisateur mis à jour',
          description: "Les informations de l'utilisateur ont été mises à jour avec succès."
        });
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Échec de la création de l'utilisateur");

        const createData: CreateUserInput = {
          id: authData.user.id,
          email: formData.email,
          display_name: formData.display_name,
          role: formData.role,
          locale: formData.locale,
          is_active: formData.is_active
        };
        
        await usersService.create(createData);
        toast({
          title: 'Utilisateur créé',
          description: "Le nouvel utilisateur a été créé avec succès."
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast({
        title: editingUser ? "Erreur lors de la mise à jour de l'utilisateur" : "Erreur lors de la création de l'utilisateur",
        description: error.message || "Une erreur est survenue lors du traitement de la demande.",
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      display_name: user.display_name,
      role: user.role,
      locale: user.locale,
      is_active: user.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.display_name} ?`)) {
      return;
    }

    setIsDeleting(user.id);
    try {
      await usersService.delete(user.id);
      toast({
        title: 'Utilisateur supprimé',
        description: "L'utilisateur a été supprimé avec succès."
      });
      loadUsers();
    } catch (error) {
      toast({
        title: "Erreur lors de la suppression de l'utilisateur",
        description: "Impossible de supprimer l'utilisateur.",
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await usersService.toggleActive(user.id);
      toast({
        title: user.is_active ? 'Utilisateur désactivé' : 'Utilisateur activé',
        description: `L'utilisateur ${user.display_name} a été ${user.is_active ? 'désactivé' : 'activé'} avec succès.`
      });
      loadUsers();
    } catch (error) {
      toast({
        title: "Erreur lors du changement de statut",
        description: "Impossible de modifier le statut de l'utilisateur.",
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      display_name: '',
      role: 'RECEPCAO',
      locale: 'pt-BR',
      is_active: true
    });
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, "default" | "secondary" | "destructive"> = {
      ADMIN: 'destructive',
      TECNICO: 'default',
      RECEPCAO: 'secondary'
    };
    
    const labels: Record<UserRole, string> = {
      ADMIN: t('role.admin'),
      TECNICO: t('role.technician'),
      RECEPCAO: t('role.reception')
    };
    
    return <Badge variant={variants[role]}>{labels[role]}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>{t('nav.users')}</CardTitle>
              <CardDescription>
                {t('user.subtitle')}
              </CardDescription>
            </div>
            <Button 
              onClick={() => { resetForm(); setIsDialogOpen(true); }}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('user.newUser')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user.name')}</TableHead>
                  <TableHead>{t('user.email')}</TableHead>
                  <TableHead>{t('user.role')}</TableHead>
                  <TableHead>{t('user.status')}</TableHead>
                  <TableHead>{t('user.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      {t('user.noUsers')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.display_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_active ? (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <UserX className="h-4 w-4 text-red-600" />
                          )}
                          <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                            {user.is_active ? t('user.active') : t('user.inactive')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            title="Éditer"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPasswordDialog(user)}
                            title="Changer le mot de passe"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
                          >
                            {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user)}
                            disabled={isDeleting === user.id}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour {selectedUserForPassword?.display_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChangeSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                  placeholder={t('user.minimumCharacters')}
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">{t('settings.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  placeholder={t('user.retypePassword')}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? t('common.updating') : "Changer le mot de passe"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modifiez les informations de l'utilisateur sélectionné."
                : "Créez un nouveau compte utilisateur."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  required
                />
              </div>
              
              {!editingUser && (
                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="display_name">Nom d'affichage</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                    <SelectItem value="TECNICO">Technicien</SelectItem>
                    <SelectItem value="RECEPCAO">Réception</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="locale">Langue</Label>
                <Select
                  value={formData.locale}
                  onValueChange={(value) => setFormData({ ...formData, locale: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Utilisateur actif</Label>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingUser ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UsersPage() {
  return (
    <AppLayout>
      <Users />
    </AppLayout>
  );
}