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
    console.log('Starting migration: client contract + vendor assignment...');
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS assigned_vendor_id UUID,
      ADD COLUMN IF NOT EXISTS contract_file_path TEXT,
      ADD COLUMN IF NOT EXISTS contract_file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contract_uploaded_at TIMESTAMP WITH TIME ZONE;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'clients_assigned_vendor_id_fkey'
            AND table_name = 'clients'
        ) THEN
          ALTER TABLE clients
          ADD CONSTRAINT clients_assigned_vendor_id_fkey
          FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_assigned_vendor_id
      ON clients(assigned_vendor_id);
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
