import fs from 'fs';
import path from 'path';
import { NotFoundError } from '../errors/AppError';
import { uploadFileToS3, downloadFileFromS3, fileExistsInS3 } from './s3Client';

type StorageType = 'local' | 's3';

const STORAGE_TYPE: StorageType = (process.env.STORAGE_TYPE as StorageType) || 'local';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

/**
 * Unified storage interface that abstracts between local and S3 storage
 */

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  try {
    console.log(`[Storage] Uploading ${STORAGE_TYPE}: ${key}`);
    
    if (STORAGE_TYPE === 's3') {
      await uploadFileToS3(key, buffer, mimeType);
    } else {
      // Local storage
      const absPath = path.join(UPLOAD_DIR, key);
      const dir = path.dirname(absPath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(absPath, buffer);
      console.log(`[Storage] Local upload successful: ${key}`);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Storage] Upload failed: ${errMsg}`);
    throw error;
  }
}

export async function downloadFile(key: string): Promise<Buffer> {
  try {
    console.log(`[Storage] Downloading ${STORAGE_TYPE}: ${key}`);
    
    if (STORAGE_TYPE === 's3') {
      return await downloadFileFromS3(key);
    } else {
      // Local storage
      const absPath = path.join(UPLOAD_DIR, key);
      if (!fs.existsSync(absPath)) {
        throw new NotFoundError('File not found on disk');
      }
      const buffer = await fs.promises.readFile(absPath);
      console.log(`[Storage] Local download successful: ${key}`);
      return buffer;
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Storage] Download failed: ${errMsg}`);
    throw error;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  if (STORAGE_TYPE === 's3') {
    return fileExistsInS3(key);
  } else {
    // Local storage
    const absPath = path.join(UPLOAD_DIR, key);
    return fs.existsSync(absPath);
  }
}

export function getFileUrl(key: string): string {
  if (STORAGE_TYPE === 's3') {
    const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
    const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'fdih-documents';
    return `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  } else {
    // Local storage
    return `/api/documents/${key.split('/')[0]}/file`;
  }
}

export function getStorageType(): StorageType {
  return STORAGE_TYPE;
}
