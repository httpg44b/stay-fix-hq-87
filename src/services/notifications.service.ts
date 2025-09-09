import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

class NotificationsService {
  async getMyNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return data;
  }

  async getUnreadCount(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return data?.length || 0;
  }

  async sendAssignmentEmail(assigneeId: string, ticketData: any) {
    try {
      // Get technician data
      const { data: technicianData, error: techError } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', assigneeId)
        .single();

      if (techError) throw techError;

      // Get hotel data
      const { data: hotelData, error: hotelError } = await supabase
        .from('hotels')
        .select('name')
        .eq('id', ticketData.hotel_id)
        .single();

      if (hotelError) throw hotelError;

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke('send-assignment-email', {
        body: {
          technicianEmail: technicianData.email,
          technicianName: technicianData.display_name,
          ticketTitle: ticketData.title,
          ticketId: ticketData.id,
          roomNumber: ticketData.room_number,
          hotelName: hotelData.name,
          priority: ticketData.priority
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending assignment email:', error);
      throw error;
    }
  }
}

export const notificationsService = new NotificationsService();