import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';
import { randomBytes } from 'crypto';

export class StorageService {
  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    orgId: string,
    vendorId: string
  ): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'File storage is not configured. Please contact your administrator.',
        503,
        'STORAGE_NOT_CONFIGURED'
      );
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const hash = randomBytes(8).toString('hex');
      const filename = `${timestamp}-${hash}.pdf`;

      // Construct storage path: {orgId}/{vendorId}/{filename}
      const filePath = `${orgId}/${vendorId}/${filename}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase!.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file.buffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new AppError(
          `Failed to upload file: ${error.message}`,
          500,
          'UPLOAD_FAILED'
        );
      }

      console.log('File uploaded successfully:', data.path);
      return data.path;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Storage service error:', error);
      throw new AppError(
        'Failed to upload file to storage',
        500,
        'STORAGE_ERROR'
      );
    }
  }

  /**
   * Get a signed URL for downloading a file
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'File storage is not configured. Please contact your administrator.',
        503,
        'STORAGE_NOT_CONFIGURED'
      );
    }

    try {
      const { data, error } = await supabase!.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Supabase signed URL error:', error);
        throw new AppError(
          `Failed to generate download URL: ${error.message}`,
          500,
          'SIGNED_URL_FAILED'
        );
      }

      return data.signedUrl;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Storage service error:', error);
      throw new AppError(
        'Failed to generate download URL',
        500,
        'STORAGE_ERROR'
      );
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      // Silently fail if storage is not configured
      console.warn('Storage not configured, skipping file deletion');
      return;
    }

    try {
      const { error } = await supabase!.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        // Don't throw error on delete failure, just log it
        console.warn(`Failed to delete file: ${error.message}`);
      } else {
        console.log('File deleted successfully:', filePath);
      }
    } catch (error) {
      console.error('Storage service error:', error);
      // Don't throw error on delete failure, just log it
    }
  }

  /**
   * Download file buffer (for OCR processing)
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    if (!isSupabaseConfigured()) {
      throw new AppError(
        'File storage is not configured. Please contact your administrator.',
        503,
        'STORAGE_NOT_CONFIGURED'
      );
    }

    try {
      const { data, error } = await supabase!.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        console.error('Supabase download error:', error);
        throw new AppError(
          `Failed to download file: ${error.message}`,
          500,
          'DOWNLOAD_FAILED'
        );
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Storage service error:', error);
      throw new AppError(
        'Failed to download file from storage',
        500,
        'STORAGE_ERROR'
      );
    }
  }
}

export const storageService = new StorageService();
