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
    console.log('Starting migration: PO pricing + scope...');
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS service_scope VARCHAR(20) DEFAULT 'non_recurring';
    `);

    await client.query(`
      UPDATE purchase_orders
      SET service_scope = 'non_recurring'
      WHERE service_scope IS NULL;
    `);

    await client.query(`
      ALTER TABLE po_line_items
      ALTER COLUMN unit_price DROP NOT NULL,
      ALTER COLUMN amount DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS vendor_unit_price DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS client_unit_price DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS vendor_amount DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS client_amount DECIMAL(12, 2);
    `);

    await client.query(`
      UPDATE po_line_items
      SET vendor_unit_price = COALESCE(vendor_unit_price, unit_price),
          client_unit_price = COALESCE(client_unit_price, unit_price),
          vendor_amount = COALESCE(vendor_amount, amount),
          client_amount = COALESCE(client_amount, amount)
      WHERE vendor_unit_price IS NULL
         OR client_unit_price IS NULL
         OR vendor_amount IS NULL
         OR client_amount IS NULL;
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
