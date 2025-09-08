import { supabase } from '@/integrations/supabase/client';

export interface Hotel {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHotelInput {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  is_active?: boolean;
}

export interface UpdateHotelInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  is_active?: boolean;
}

class HotelsService {
  /**
   * Get all hotels
   */
  async getAll() {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Hotel[];
  }

  /**
   * Get hotel by ID
   */
  async getById(id: string) {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Hotel;
  }

  /**
   * Create a new hotel
   */
  async create(input: CreateHotelInput) {
    const { data, error } = await supabase
      .from('hotels')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as Hotel;
  }

  /**
   * Update a hotel
   */
  async update(id: string, input: UpdateHotelInput) {
    const { data, error } = await supabase
      .from('hotels')
      .update(input)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Hotel não encontrado');
    return data as Hotel;
  }

  /**
   * Delete a hotel
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Toggle hotel active status
   */
  async toggleActive(id: string) {
    const hotel = await this.getById(id);
    return this.update(id, { is_active: !hotel.is_active });
  }

  /**
   * Assign user to hotel
   */
  async assignUser(userId: string, hotelId: string) {
    const { error } = await supabase
      .from('user_hotels')
      .insert({ user_id: userId, hotel_id: hotelId });

    if (error) throw error;
  }

  /**
   * Remove user from hotel
   */
  async removeUser(userId: string, hotelId: string) {
    const { error } = await supabase
      .from('user_hotels')
      .delete()
      .eq('user_id', userId)
      .eq('hotel_id', hotelId);

    if (error) throw error;
  }

  /**
   * Get users assigned to a hotel
   */
  async getHotelUsers(hotelId: string) {
    const { data, error } = await supabase
      .from('user_hotels')
      .select('*, users(*)')
      .eq('hotel_id', hotelId);

    if (error) throw error;
    return data;
  }

  /**
   * Get hotels assigned to a user
   */
  async getUserHotels(userId: string) {
    const { data, error } = await supabase
      .from('user_hotels')
      .select('*, hotels(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }
}

export const hotelsService = new HotelsService();