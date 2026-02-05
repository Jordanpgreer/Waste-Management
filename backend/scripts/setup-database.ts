import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const setupDatabase = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase
    },
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database!');

    console.log('📄 Reading schema file...');
    const schemaPath = join(__dirname, '../src/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    console.log('🚀 Running database schema...');
    await client.query(schema);
    console.log('✅ Database schema created successfully!');

    client.release();
    await pool.end();

    console.log('');
    console.log('🎉 Database setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start your backend server: npm run dev');
    console.log('2. Create your first organization and admin user');
    console.log('');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
};

setupDatabase();
