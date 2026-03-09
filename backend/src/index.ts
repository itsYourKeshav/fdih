import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import documentsRouter from './routes/documents';
import analyticsRouter from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';
import { getStorageType } from './adapters/storageService';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const STORAGE_TYPE = getStorageType();
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

// Ensure uploads directory exists if using local storage
if (STORAGE_TYPE === 'local') {
    fs.mkdirSync(path.resolve(UPLOAD_DIR), { recursive: true });
}

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/documents', documentsRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`FDIH API running on http://localhost:${PORT}`);
    console.log(`DEMO_ORG_ID: ${process.env.DEMO_ORG_ID}`);
    console.log(`STORAGE_TYPE: ${STORAGE_TYPE}`);
    if (STORAGE_TYPE === 's3') {
        console.log(`AWS_BUCKET_NAME: ${process.env.AWS_BUCKET_NAME}`);
        console.log(`AWS_REGION: ${process.env.AWS_REGION}`);
    } else {
        console.log(`UPLOAD_DIR: ${path.resolve(UPLOAD_DIR)}`);
    }
});

export default app;
