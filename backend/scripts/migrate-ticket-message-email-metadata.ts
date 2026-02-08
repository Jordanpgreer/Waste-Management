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
    console.log('Starting migration: add email/file metadata columns to ticket_messages...');
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE ticket_messages
      ADD COLUMN IF NOT EXISTS email_from VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email_to TEXT,
      ADD COLUMN IF NOT EXISTS email_subject VARCHAR(500),
      ADD COLUMN IF NOT EXISTS source_file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS source_file_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS source_file_size BIGINT,
      ADD COLUMN IF NOT EXISTS source_file_type VARCHAR(100);
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
