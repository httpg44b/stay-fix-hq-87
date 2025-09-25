import { supabase } from '@/integrations/supabase/client';
import { TicketStatus, TicketPriority, TicketCategory } from '@/lib/constants';
import { notificationsService } from './notifications.service';

export interface CreateTicketInput {
  room_number: string;
  category: TicketCategory;
  priority: TicketPriority;
  title: string;
  description: string;
  hotel_id: string;
  creator_id: string;
  images?: string[];
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  assignee_id?: string;
  priority?: TicketPriority;
  solution?: string;
  solution_images?: string[];
  closed_at?: string;
  images?: string[];
  title?: string;
  description?: string;
  category?: TicketCategory;
  room_number?: string;
  hotel_id?: string;
}

class TicketsService {
  async create(input: CreateTicketInput) {
    const { data, error } = await supabase
      .from('tickets')
      .insert([{ ...input, images: input.images || [] }])
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
    // Get the current ticket data before update
    const { data: currentTicket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('tickets')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Send email notification if a technician is being assigned
    if (input.assignee_id && (!currentTicket?.assignee_id || currentTicket.assignee_id !== input.assignee_id)) {
      try {
        await notificationsService.sendAssignmentEmail(input.assignee_id, data);
      } catch (error) {
        console.error('Error sending assignment email:', error);
        // Don't fail the update if email fails
      }
    }

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

  async delete(id: string) {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const ticketsService = new TicketsService();