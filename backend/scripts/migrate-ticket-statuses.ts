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
    console.log('Starting migration: ticket status enum update...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TYPE ticket_status_new AS ENUM (
        'untouched',
        'client_approval',
        'vendor_rates',
        'quoted_to_client',
        'response_from_vendor',
        'response_from_client',
        'completed',
        'eta_received_from_vendor',
        'eta_provided_to_client',
        'waiting_on_client_info',
        'waiting_on_vendor_info',
        'cancelled'
      );
    `);

    await client.query(`
      ALTER TABLE tickets
      ALTER COLUMN status DROP DEFAULT;
    `);

    await client.query(`
      ALTER TABLE tickets
      ALTER COLUMN status TYPE ticket_status_new
      USING (
        CASE status::text
          WHEN 'new' THEN 'untouched'
          WHEN 'triaged' THEN 'client_approval'
          WHEN 'vendor_assigned' THEN 'vendor_rates'
          WHEN 'scheduled' THEN 'eta_received_from_vendor'
          WHEN 'in_progress' THEN 'response_from_vendor'
          WHEN 'verified' THEN 'eta_provided_to_client'
          WHEN 'closed' THEN 'completed'
          ELSE status::text
        END
      )::ticket_status_new;
    `);

    await client.query(`
      DROP TYPE ticket_status;
    `);

    await client.query(`
      ALTER TYPE ticket_status_new RENAME TO ticket_status;
    `);

    await client.query(`
      ALTER TABLE tickets
      ALTER COLUMN status SET DEFAULT 'untouched';
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
