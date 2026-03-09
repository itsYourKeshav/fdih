// FR-021, FR-022

import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';

const router = express.Router();
const DEMO_ORG_ID = process.env.DEMO_ORG_ID!;

// ──  GET /api/analytics/field-accuracy  ────────────────────────────────────
router.get('/field-accuracy', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const { rows } = await pool.query(
            `SELECT field_name,
              ROUND(AVG(confidence)::numeric, 1) AS avg_confidence
       FROM extracted_fields
       WHERE org_id=$1
       GROUP BY field_name
       ORDER BY avg_confidence DESC`,
            [DEMO_ORG_ID]
        );
        res.json({ fields: rows });
    } catch (err) { next(err); }
});

// ──  GET /api/analytics/trend  ──────────────────────────────────────────────
router.get('/trend', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const { rows } = await pool.query(
            `SELECT TO_CHAR(DATE_TRUNC('month', uploaded_at), 'YYYY-MM') AS month,
              COUNT(*)::int AS doc_count,
              ROUND(AVG(overall_confidence)::numeric, 1) AS avg_confidence
       FROM documents
       WHERE org_id=$1
         AND uploaded_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
         AND overall_confidence IS NOT NULL
       GROUP BY month
       ORDER BY month ASC`,
            [DEMO_ORG_ID]
        );
        res.json({ months: rows });
    } catch (err) { next(err); }
});

// ──  GET /api/analytics/distribution  ──────────────────────────────────────
router.get('/distribution', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const { rows } = await pool.query(
            `SELECT
         CASE
           WHEN overall_confidence >= 85 THEN 'high'
           WHEN overall_confidence >= 60 THEN 'medium'
           ELSE 'low'
         END AS tier,
         COUNT(*)::int AS count
       FROM documents
       WHERE org_id=$1 AND overall_confidence IS NOT NULL
       GROUP BY tier`,
            [DEMO_ORG_ID]
        );
        // Ensure all three tiers are present even if count is 0
        const tiers = ['high', 'medium', 'low'];
        const filled = tiers.map(tier => ({
            tier,
            count: rows.find(r => r.tier === tier)?.count ?? 0,
        }));
        res.json({ distribution: filled });
    } catch (err) { next(err); }
});

export default router;
