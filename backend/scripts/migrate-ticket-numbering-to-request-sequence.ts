import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: ticket numbering to request sequence...');
    await client.query('BEGIN');

    // Phase 1: assign temporary unique values to avoid unique constraint collisions.
    await client.query(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM tickets
        WHERE deleted_at IS NULL
      )
      UPDATE tickets t
      SET ticket_number = 'TMP-' || ordered.rn::TEXT
      FROM ordered
      WHERE t.id = ordered.id;
    `);

    // Phase 2: assign final request numbers starting at 120.
    await client.query(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM tickets
        WHERE deleted_at IS NULL
      )
      UPDATE tickets t
      SET ticket_number = (ordered.rn + 119)::TEXT
      FROM ordered
      WHERE t.id = ordered.id;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
