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

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

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
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista de usuários.',
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
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'Digite a mesma senha nos dois campos.',
        variant: 'destructive'
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: selectedUserForPassword.id, newPassword: passwordForm.newPassword }
      });
      if (error) throw error;

      toast({
        title: 'Senha atualizada',
        description: `Senha de ${selectedUserForPassword.display_name} alterada com sucesso.`
      });
      setIsPasswordDialogOpen(false);
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: err.message || 'Não foi possível alterar a senha.',
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
        // Update existing user
        const updateData: UpdateUserInput = {
          display_name: formData.display_name,
          role: formData.role,
          locale: formData.locale,
          is_active: formData.is_active
        };
        
        await usersService.update(editingUser.id, updateData);
        toast({
          title: 'Usuário atualizado',
          description: 'As informações do usuário foram atualizadas com sucesso.'
        });
      } else {
        // Create new user in auth first
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Falha ao criar usuário');

        // Then create user profile
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
          title: 'Usuário criado',
          description: 'O novo usuário foi criado com sucesso.'
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast({
        title: editingUser ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário',
        description: error.message || 'Ocorreu um erro ao processar a solicitação.',
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
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.display_name}?`)) {
      return;
    }

    setIsDeleting(user.id);
    try {
      await usersService.delete(user.id);
      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi excluído com sucesso.'
      });
      loadUsers();
    } catch (error) {
      toast({
        title: 'Erro ao excluir usuário',
        description: 'Não foi possível excluir o usuário.',
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
        title: user.is_active ? 'Usuário desativado' : 'Usuário ativado',
        description: `O usuário ${user.display_name} foi ${user.is_active ? 'desativado' : 'ativado'} com sucesso.`
      });
      loadUsers();
    } catch (error) {
      toast({
        title: 'Erro ao alterar status',
        description: 'Não foi possível alterar o status do usuário.',
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
      ADMIN: 'Administrador',
      TECNICO: 'Técnico',
      RECEPCAO: 'Recepção'
    };
    
    return <Badge variant={variants[role]}>{labels[role]}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciar Usuários</CardTitle>
              <CardDescription>
                Gerencie os usuários do sistema e suas permissões
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'ALL')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os papéis</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="TECNICO">Técnico</SelectItem>
                <SelectItem value="RECEPCAO">Recepção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Nenhum usuário encontrado
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
                            {user.is_active ? 'Ativo' : 'Inativo'}
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
                            title={user.is_active ? 'Désactiver' : 'Activer'}
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
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Minimum 6 caractères"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  placeholder="Retapez le mot de passe"
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
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
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Atualize as informações do usuário' : 'Preencha os dados do novo usuário'}
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
                  <Label htmlFor="password">Senha</Label>
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
                <Label htmlFor="display_name">Nome de Exibição</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Papel</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="TECNICO">Técnico</SelectItem>
                    <SelectItem value="RECEPCAO">Recepção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="locale">Idioma</Label>
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
                <Label htmlFor="is_active">Usuário ativo</Label>
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