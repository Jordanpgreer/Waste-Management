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
    console.log('Starting migration: Update vendor performance_score column...');

    await client.query('BEGIN');

    // Change performance_score from DECIMAL(3,2) to DECIMAL(5,2) to allow 0-100 range
    await client.query(`
      ALTER TABLE vendors
      ALTER COLUMN performance_score TYPE DECIMAL(5, 2);
    `);

    await client.query('COMMIT');

    console.log('Migration completed successfully!');
    console.log('Vendor performance_score column now supports values from 0.00 to 999.99');
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
