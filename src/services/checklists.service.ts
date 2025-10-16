import { supabase } from '@/integrations/supabase/client';

export type ChecklistStatus = 'pending' | 'in_progress' | 'completed';

export interface Checklist {
  id: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  hotel_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChecklistInput {
  title: string;
  description?: string;
  hotel_id: string;
  status?: ChecklistStatus;
}

export interface UpdateChecklistInput {
  title?: string;
  description?: string;
  status?: ChecklistStatus;
}

class ChecklistsService {
  async getAll(hotelId?: string): Promise<Checklist[]> {
    let query = supabase
      .from('checklists')
      .select('*')
      .order('created_at', { ascending: false });

    if (hotelId) {
      query = query.eq('hotel_id', hotelId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<Checklist> {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(input: CreateChecklistInput): Promise<Checklist> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('checklists')
      .insert({
        title: input.title,
        description: input.description || null,
        hotel_id: input.hotel_id,
        status: input.status || 'pending',
        creator_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, input: UpdateChecklistInput): Promise<Checklist> {
    const { data, error } = await supabase
      .from('checklists')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateStatus(id: string, status: ChecklistStatus): Promise<Checklist> {
    return this.update(id, { status });
  }
}

export const checklistsService = new ChecklistsService();
