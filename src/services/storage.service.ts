import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  private bucketName = 'ticket-images';

  /**
   * Upload genérico (imagem ou vídeo).
   * Retorna SEMPRE o path dentro do bucket (ex: "ticket-id/uuid.jpg")
   * para ser salvo no banco.
   */
  async uploadTicketMedia(file: File, ticketId: string): Promise<string> {
    try {
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        return await this.uploadVideo(file, ticketId);
      } else {
        return await this.uploadImageDirect(file, ticketId);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Upload de imagem (com compressão opcional no cliente).
   * Retorna APENAS o path do arquivo no bucket.
   */
  private async uploadImageDirect(file: File, ticketId: string): Promise<string> {
    try {
      let fileToUpload = file;

      // Comprime no cliente se a imagem for maior que 1MB
      if (file.size > 1024 * 1024) {
        fileToUpload = await this.compressImageClient(file, 0.7, 1200, 1200);
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${ticketId}/${uuidv4()}.${fileExt}`;

      const { error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileToUpload, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // No banco vamos guardar somente o path
      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Compressão client-side simples usando canvas.
   */
  private async compressImageClient(
    file: File,
    quality: number,
    maxWidth: number,
    maxHeight: number
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;

        // Calcula novas dimensões mantendo proporção
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

  /**
   * Upload de vídeo.
   * Retorna APENAS o path do arquivo no bucket.
   */
  private async uploadVideo(file: File, ticketId: string): Promise<string> {
    try {
      // Tamanho máximo 50MB
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Video file size must be less than 50MB');
      }

      const fileExt = file.name.split('.').pop() || 'mp4';
      const filePath = `${ticketId}/${uuidv4()}.${fileExt}`;

      const { error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // No banco vamos guardar somente o path
      return filePath;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  /**
   * Alias para manter compatibilidade com código antigo.
   * Continua existindo, mas agora também retorna o PATH.
   */
  async uploadTicketImage(file: File, ticketId: string): Promise<string> {
    return this.uploadTicketMedia(file, ticketId);
  }

  /**
   * Deleta um arquivo do bucket.
   * Aceita tanto path ("ticket-id/arquivo.jpg") quanto URL completa.
   */
  async deleteTicketImage(imageRef: string): Promise<void> {
    try {
      let filePath = imageRef;

      // Se for URL completa, extrai o path
      if (imageRef.startsWith('http')) {
        const extracted = this.extractPathFromUrl(imageRef);
        if (!extracted) {
          throw new Error('Invalid image URL');
        }
        filePath = extracted;
      }

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Gera uma signed URL a partir de um path (ou URL antiga).
   */
  async getImageUrl(pathOrUrl: string): Promise<string> {
    try {
      const path = pathOrUrl.startsWith('http')
        ? this.extractPathFromUrl(pathOrUrl) ?? ''
        : pathOrUrl;

      if (!path) {
        console.warn('getImageUrl: empty path');
        return '';
      }

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(path, 3600); // 1h

      if (error) {
        console.error('Error creating signed URL:', error);
        return '';
      }

      return data?.signedUrl || '';
    } catch (error) {
      console.error('Error in getImageUrl:', error);
      return '';
    }
  }

  async getSignedUrl(pathOrUrl: string, expiresIn: number = 3600): Promise<string> {
    const path = pathOrUrl.startsWith('http')
      ? this.extractPathFromUrl(pathOrUrl) ?? ''
      : pathOrUrl;

    if (!path) {
      throw new Error('Invalid path for signed URL');
    }

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  }

  /**
   * Detecta se a URL é do padrão público (não deve ser usada para bucket privado).
   */
  isPublicUrlPattern(url: string): boolean {
    return url.includes('/object/public/');
  }

  /**
   * Extrai o path de um objeto dentro do bucket a partir de uma URL do Supabase.
   * Ex.: /storage/v1/object/sign/ticket-images/ticket-id/arquivo.png
   *  -> "ticket-id/arquivo.png"
   */
  extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // /storage/v1/object/public/bucket/path
      const publicMatch = pathname.match(/\/object\/public\/[^/]+\/(.+)/);
      if (publicMatch) {
        return publicMatch[1];
      }

      // /storage/v1/object/sign/bucket/path
      const signMatch = pathname.match(/\/object\/sign\/[^/]+\/(.+)/);
      if (signMatch) {
        return signMatch[1];
      }

      // Fallback: procura bucket diretamente no path
      const bucketPattern = new RegExp(`/${this.bucketName}/(.+)`);
      const bucketMatch = pathname.match(bucketPattern);
      if (bucketMatch) {
        return bucketMatch[1];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Recebe um array de paths OU URLs antigas e devolve
   * um array de signed URLs frescas (para usar em <img>/<video>).
   */
  async refreshSignedUrls(refs: string[]): Promise<string[]> {
    const refreshedUrls = await Promise.all(
      refs.map(async (ref) => {
        try {
          const path = ref.startsWith('http') ? this.extractPathFromUrl(ref) : ref;

          if (!path) {
            console.warn('Could not extract path from ref, returning original:', ref);
            return ref;
          }

          const newUrl = await this.getImageUrl(path);
          if (newUrl) {
            return newUrl;
          }

          console.warn('Could not create signed URL, returning original:', ref);
          return ref;
        } catch (error) {
          console.error('Error refreshing signed URL:', error);
          return ref; // Em caso de erro, mantém o original
        }
      })
    );

    return refreshedUrls;
  }
}

export const storageService = new StorageService();