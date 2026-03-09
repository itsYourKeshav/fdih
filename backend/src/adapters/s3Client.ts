import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { NotFoundError } from '../errors/AppError';
import dotenv from 'dotenv';

dotenv.config();

const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const AWS_ENDPOINT = process.env.AWS_ENDPOINT;
const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'fdih-documents';

const s3Client = new S3Client({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT,
  // Supabase S3-compatible API works reliably with path-style requests.
  forcePathStyle: Boolean(AWS_ENDPOINT),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

/**
 * Upload a file to S3
 * @param key S3 object key (e.g., "documentId/filename.pdf")
 * @param body File buffer
 * @param contentType MIME type
 */
export async function uploadFileToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  try {
    console.log(`[S3] Uploading: s3://${BUCKET_NAME}/${key} (${body.length} bytes)`);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    
    await s3Client.send(command);
    console.log(`[S3] Upload successful: ${key}`);
    return key;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[S3] Upload failed for ${key}: ${errMsg}`);
    throw new Error(`S3 upload failed: ${errMsg}`);
  }
}

/**
 * Download a file from S3
 * @param key S3 object key
 * @returns File buffer
 */
export async function downloadFileFromS3(key: string): Promise<Buffer> {
  try {
    console.log(`[S3] Downloading: s3://${BUCKET_NAME}/${key}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    const chunks: Buffer[] = [];

    if (!response.Body) {
      throw new NotFoundError('File not found in S3');
    }

    for await (const chunk of response.Body as unknown as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    console.log(`[S3] Download successful: ${key} (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    if ((error as any).name === 'NoSuchKey' || error instanceof NotFoundError) {
      console.warn(`[S3] File not found: ${key}`);
      throw new NotFoundError('File not found in S3');
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[S3] Download failed for ${key}: ${errMsg}`);
    throw new Error(`S3 download failed: ${errMsg}`);
  }
}

/**
 * Check if a file exists in S3
 * @param key S3 object key
 */
export async function fileExistsInS3(key: string): Promise<boolean> {
  try {
    console.log(`[S3] Checking existence: s3://${BUCKET_NAME}/${key}`);
    
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
    console.log(`[S3] File exists: ${key}`);
    return true;
  } catch (error) {
    if ((error as any).name === 'NotFound') {
      console.log(`[S3] File does not exist: ${key}`);
      return false;
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[S3] Head check failed for ${key}: ${errMsg}`);
    throw error;
  }
}

/**
 * Get S3 object URL (pre-signed or public)
 * Note: For public access, use standard HTTPS URL
 */
export function getS3ObjectUrl(key: string): string {
  if (AWS_ENDPOINT) {
    return `${AWS_ENDPOINT.replace(/\/$/, '')}/${BUCKET_NAME}/${key}`;
  }
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export { s3Client };
