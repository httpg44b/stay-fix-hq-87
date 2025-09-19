import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  private bucketName = 'ticket-images';

  async uploadTicketMedia(file: File, ticketId: string): Promise<string> {
    try {
      // Check if it's a video file
      const isVideo = file.type.startsWith('video/');
      
      if (isVideo) {
        // For videos, upload directly without compression
        return await this.uploadVideo(file, ticketId);
      } else {
        // For images, use compression
        return await this.uploadImage(file, ticketId);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  private async uploadImage(file: File, ticketId: string): Promise<string> {
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Call compression edge function
      const { data, error } = await supabase.functions.invoke('compress-image', {
        body: {
          file: base64,
          fileName: file.name,
          ticketId: ticketId,
          quality: 70,
          maxWidth: 1200,
          maxHeight: 1200
        }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to compress and upload image');
      }

      console.log(`Image compressed: ${data.compressionRatio}% reduction (${data.originalSize} → ${data.compressedSize} bytes)`);
      
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  private async uploadVideo(file: File, ticketId: string): Promise<string> {
    try {
      // Check video size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('Video file size must be less than 50MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) throw error;

      return this.getImageUrl(fileName);
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  // Backward compatibility
  async uploadTicketImage(file: File, ticketId: string): Promise<string> {
    return this.uploadTicketMedia(file, ticketId);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async deleteTicketImage(imageUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf(this.bucketName);
      
      if (bucketIndex === -1) {
        throw new Error('Invalid image URL');
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  getImageUrl(path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);
    
    return publicUrl;
  }
}

export const storageService = new StorageService();