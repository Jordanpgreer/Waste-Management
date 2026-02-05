import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Log connection details (excluding password) for debugging
console.log('=== Database Configuration ===');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('Port:', process.env.DB_PORT || '5432');
console.log('Database:', process.env.DB_NAME || 'waste_management');
console.log('User:', process.env.DB_USER || 'postgres');
console.log('Has Password:', !!process.env.DB_PASSWORD);
console.log('Has Connection String:', !!process.env.DATABASE_URL);
console.log('==============================');

// Prefer connection string if available, otherwise use individual parameters
let poolConfig: PoolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'waste_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.DB_HOST?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : false,
  };
}

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export default pool;
