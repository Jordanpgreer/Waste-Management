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
    console.log('Starting migration: Add PO fields to existing tables...');

    const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '002_add_po_fields_to_invoices.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');

    console.log('Migration completed successfully!');
    console.log('Updated tables:');
    console.log('  - invoices (added po_id column)');
    console.log('  - invoice_line_items (added po_line_item_id and match_status columns)');
    console.log('  - tickets (added po_number column)');
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
