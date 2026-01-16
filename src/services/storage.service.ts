import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  private bucketName = 'ticket-images';

  async uploadTicketMedia(file: File, ticketId: string): Promise<string> {
    try {
      const isVideo = file.type.startsWith('video/');
      
      if (isVideo) {
        return await this.uploadVideo(file, ticketId);
      } else {
        // Compress image on client side for faster upload
        return await this.uploadImageDirect(file, ticketId);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  private async uploadImageDirect(file: File, ticketId: string): Promise<string> {
    try {
      let fileToUpload = file;
      
      // Compress image on client side if larger than 1MB
      if (file.size > 1024 * 1024) {
        fileToUpload = await this.compressImageClient(file, 0.7, 1200, 1200);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, fileToUpload, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) throw error;

      // Return signed URL for private bucket
      return await this.getImageUrl(fileName);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  private async compressImageClient(file: File, quality: number, maxWidth: number, maxHeight: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
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

      // Return signed URL for private bucket
      return await this.getImageUrl(fileName);
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  // Backward compatibility
  async uploadTicketImage(file: File, ticketId: string): Promise<string> {
    return this.uploadTicketMedia(file, ticketId);
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

  async getImageUrl(path: string): Promise<string> {
    // Use signed URLs for private bucket (1 hour expiry)
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, 3600);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return '';
    }
    
    return data?.signedUrl || '';
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  }
}

export const storageService = new StorageService();