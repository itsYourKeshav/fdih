import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }
    
    // Log full error details for debugging
    if (err instanceof Error) {
        console.error('Unhandled error:', err.message);
        console.error('Stack:', err.stack);
    } else {
        console.error('Unhandled error:', JSON.stringify(err));
    }
    
    res.status(500).json({ error: 'Internal server error' });
}
