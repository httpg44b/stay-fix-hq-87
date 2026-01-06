import { supabase } from '@/integrations/supabase/client';

export type ChecklistStatus = 'pending' | 'in_progress' | 'completed';
export type RoomStatus = 'ok' | 'warning' | 'error' | 'not_verified';

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistRoomStatus {
  id: string;
  checklist_id: string;
  room_id: string;
  status: RoomStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: string;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  hotel_id: string;
  creator_id: string;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
  items?: ChecklistItem[];
  room_statuses?: ChecklistRoomStatus[];
}

export interface CreateChecklistInput {
  title: string;
  description?: string;
  hotel_id: string;
  status?: ChecklistStatus;
  scheduled_date?: string | null;
}

export interface UpdateChecklistInput {
  title?: string;
  description?: string;
  status?: ChecklistStatus;
  scheduled_date?: string | null;
}

export interface CreateChecklistItemData {
  title: string;
  description?: string;
}

class ChecklistsService {
  async getAll(hotelId?: string): Promise<Checklist[]> {
    let query = supabase
      .from('checklists')
      .select(`
        *,
        checklist_items (*)
      `)
      .order('created_at', { ascending: false });

    if (hotelId) {
      query = query.eq('hotel_id', hotelId);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    return (data || []).map((checklist: any) => ({
      ...checklist,
      items: (checklist.checklist_items || []).sort((a: ChecklistItem, b: ChecklistItem) => a.order_index - b.order_index)
    }));
  }

  async getById(id: string): Promise<Checklist> {
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        checklist_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    return {
      ...data,
      items: (data.checklist_items || []).sort((a: ChecklistItem, b: ChecklistItem) => a.order_index - b.order_index)
    };
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
        scheduled_date: input.scheduled_date || null,
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

  // Checklist Items Operations
  async addItem(checklistId: string, data: CreateChecklistItemData): Promise<ChecklistItem> {
    // Get the max order_index for this checklist
    const { data: items } = await supabase
      .from('checklist_items')
      .select('order_index')
      .eq('checklist_id', checklistId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = items && items.length > 0 ? items[0].order_index + 1 : 0;

    const { data: item, error } = await supabase
      .from('checklist_items')
      .insert({
        checklist_id: checklistId,
        title: data.title,
        description: data.description || null,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return item;
  }

  async toggleItem(itemId: string, isCompleted: boolean): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('checklist_items')
      .update({ is_completed: isCompleted })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateItem(itemId: string, data: Partial<CreateChecklistItemData>): Promise<ChecklistItem> {
    const { data: item, error } = await supabase
      .from('checklist_items')
      .update(data)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return item;
  }

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }

  // Room Status Operations
  async setRoomStatus(checklistId: string, roomId: string, status: RoomStatus, notes?: string): Promise<ChecklistRoomStatus> {
    const { data, error } = await supabase
      .from('checklist_room_status')
      .upsert({
        checklist_id: checklistId,
        room_id: roomId,
        status,
        notes: notes || null,
      }, {
        onConflict: 'checklist_id,room_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChecklistRoomStatus;
  }

  async getRoomStatuses(checklistId: string): Promise<ChecklistRoomStatus[]> {
    const { data, error } = await supabase
      .from('checklist_room_status')
      .select('*')
      .eq('checklist_id', checklistId);

    if (error) throw error;
    return (data || []) as ChecklistRoomStatus[];
  }
}

export const checklistsService = new ChecklistsService();
