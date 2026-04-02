import { supabase } from '../../config/supabase';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import crypto from 'crypto';

/**
 * Storage Service — uploads files to Supabase Storage.
 * Buckets: id-documents, selfies, certificates, pay-statements
 *
 * Files are stored with hashed names (never original filenames) for privacy.
 * Returns a storage key that can be used to retrieve the file.
 */
export class StorageService {
  /**
   * Upload a file buffer to Supabase Storage.
   */
  async upload(params: {
    bucket: string;
    buffer: Buffer;
    contentType: string;
    folder?: string;
  }): Promise<string> {
    const ext = this.getExtension(params.contentType);
    const hash = crypto.randomUUID();
    const path = params.folder ? `${params.folder}/${hash}${ext}` : `${hash}${ext}`;

    const { error } = await supabase.storage
      .from(params.bucket)
      .upload(path, params.buffer, {
        contentType: params.contentType,
        upsert: false,
      });

    if (error) {
      throw new AppError(502, `Storage upload failed: ${error.message}`);
    }

    return `${params.bucket}/${path}`;
  }

  /**
   * Upload a worker's ID document image.
   */
  async uploadIdDocument(workerId: string, side: 'front' | 'back', buffer: Buffer, contentType: string): Promise<string> {
    return this.upload({
      bucket: 'id-documents',
      buffer,
      contentType,
      folder: workerId,
    });
  }

  /**
   * Upload a worker's selfie.
   */
  async uploadSelfie(workerId: string, buffer: Buffer, contentType: string): Promise<string> {
    return this.upload({
      bucket: 'selfies',
      buffer,
      contentType,
      folder: workerId,
    });
  }

  /**
   * Upload a certificate.
   */
  async uploadCertificate(workerId: string, buffer: Buffer, contentType: string): Promise<string> {
    return this.upload({
      bucket: 'certificates',
      buffer,
      contentType,
      folder: workerId,
    });
  }

  /**
   * Upload a pay statement PDF.
   */
  async uploadPayStatement(paymentId: string, pdfBuffer: Buffer): Promise<string> {
    return this.upload({
      bucket: 'pay-statements',
      buffer: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  /**
   * Get a signed URL for temporary file access (expires in 1 hour).
   */
  async getSignedUrl(storageKey: string, expiresInSeconds = 3600): Promise<string> {
    const [bucket, ...pathParts] = storageKey.split('/');
    const path = pathParts.join('/');

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new AppError(404, 'File not found');
    }

    return data.signedUrl;
  }

  /**
   * Delete a file from storage.
   */
  async deleteFile(storageKey: string): Promise<void> {
    const [bucket, ...pathParts] = storageKey.split('/');
    const path = pathParts.join('/');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error(`[STORAGE] Delete failed for ${storageKey}:`, error.message);
    }
  }

  private getExtension(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
    };
    return map[contentType] || '.bin';
  }
}

export const storageService = new StorageService();
