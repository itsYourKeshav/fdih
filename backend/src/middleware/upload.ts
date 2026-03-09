import multer, { StorageEngine } from 'multer';
import { ValidationError } from '../errors/AppError';
import { Request } from 'express';

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// Use memory storage — we write to disk ourselves with the document_id as directory
const storage: StorageEngine = multer.memoryStorage();

export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req: Request, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new ValidationError(`Invalid file type. Accepted: PDF, JPEG, PNG`));
        }
    },
}).single('file');

// Magic-byte MIME validation (defence in depth, runs after multer)
export function validateMimeByBytes(buffer: Buffer, declaredMime: string): boolean {
    const hex = buffer.slice(0, 8).toString('hex');
    if (declaredMime === 'application/pdf') return hex.startsWith('25504446'); // %PDF
    if (declaredMime === 'image/jpeg') return hex.startsWith('ffd8ff');
    if (declaredMime === 'image/png') return hex.startsWith('89504e47'); // .PNG
    return false;
}
