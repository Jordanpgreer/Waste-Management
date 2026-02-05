import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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
    console.log('Starting migration: Create purchase orders and related tables...');

    const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '001_create_purchase_orders.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');

    console.log('Migration completed successfully!');
    console.log('Created tables:');
    console.log('  - purchase_orders');
    console.log('  - po_line_items');
    console.log('  - ticket_purchase_orders');
    console.log('  - client_invoices');
    console.log('  - client_invoice_line_items');
    console.log('  - invoice_matching_records');
    console.log('  - invoice_settings');
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
