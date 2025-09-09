import { supabase } from '@/integrations/supabase/client';
import { TicketStatus, TicketPriority, TicketCategory } from '@/lib/constants';

export interface CreateTicketInput {
  room_number: string;
  category: TicketCategory;
  priority: TicketPriority;
  title: string;
  description: string;
  hotel_id: string;
  creator_id: string;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  assignee_id?: string;
  priority?: TicketPriority;
}

class TicketsService {
  async create(input: CreateTicketInput) {
    const { data, error } = await supabase
      .from('tickets')
      .insert([input])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAll() {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getById(id: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, input: UpdateTicketInput) {
    const { data, error } = await supabase
      .from('tickets')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMyTickets(userId: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getHotelTickets(hotelIds: string[]) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .in('hotel_id', hotelIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const ticketsService = new TicketsService();