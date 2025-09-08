import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'ADMIN' | 'TECNICO' | 'RECEPCAO';

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  locale: string;
  is_active: boolean;
  created_at: string;
  // Legacy fields for compatibility
  name: string;
  hotels: any[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  locale?: string;
  is_active?: boolean;
}

export interface UpdateUserInput {
  display_name?: string;
  role?: UserRole;
  locale?: string;
  is_active?: boolean;
}

class UsersService {
  private mapUserData(data: any): User {
    return {
      ...data,
      // Map new fields to legacy fields for compatibility
      name: data.display_name,
      hotels: [], // Will be populated when we implement hotels
      active: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.created_at)
    };
  }

  /**
   * Get all users (Admin only)
   */
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(user => this.mapUserData(user));
  }

  /**
   * Get a single user by ID
   */
  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapUserData(data);
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return this.mapUserData(data);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      throw new Error('Not authenticated');
    }

    return this.getById(authUser.id);
  }

  /**
   * Create a new user
   */
  async create(input: CreateUserInput) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: input.id,
        email: input.email,
        display_name: input.display_name,
        role: input.role,
        locale: input.locale || 'pt-BR',
        is_active: input.is_active ?? true
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapUserData(data);
  }

  /**
   * Update a user by ID
   */
  async update(id: string, input: UpdateUserInput) {
    const { data, error } = await supabase
      .from('users')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapUserData(data);
  }

  /**
   * Delete a user by ID (Admin only)
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Search users by display name or email
   */
  async search(query: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('display_name');

    if (error) throw error;
    return data.map(user => this.mapUserData(user));
  }

  /**
   * Get users by role
   */
  async getByRole(role: UserRole) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .eq('is_active', true)
      .order('display_name');

    if (error) throw error;
    return data.map(user => this.mapUserData(user));
  }

  /**
   * Toggle user active status
   */
  async toggleActive(id: string) {
    const user = await this.getById(id);
    return this.update(id, { is_active: !user.active });
  }
}

export const usersService = new UsersService();