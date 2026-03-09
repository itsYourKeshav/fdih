import { pool } from './pool';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_applied (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Run migration files in alphabetical order FIRST (tables must exist before seeding)
    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM migrations_applied WHERE name = $1', [file]
      );
      if (rows.length > 0) { console.log(`skip:    ${file}`); continue; }

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO migrations_applied (name) VALUES ($1)', [file]);
      console.log(`applied: ${file}`);
    }

    // Seed the demo org AFTER tables exist — idempotent
    await client.query(`
      INSERT INTO organisations (id, name) VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `, [process.env.DEMO_ORG_ID, 'Apex Logistics Demo']);
    console.log('seeded:  demo org');

    console.log('✓ Migrations complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
