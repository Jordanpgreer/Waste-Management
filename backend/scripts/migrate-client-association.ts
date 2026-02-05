import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

const migrate = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Running migration: Add client association to users...\n');

    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'client_id';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column client_id already exists. Skipping migration.\n');
      return;
    }

    // Add client_id column
    console.log('📝 Adding client_id column to users table...');
    await client.query(`
      ALTER TABLE users ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    `);
    console.log('✅ Column added\n');

    // Add index
    console.log('📝 Adding index for performance...');
    await client.query(`
      CREATE INDEX idx_users_client_id ON users(client_id);
    `);
    console.log('✅ Index created\n');

    // Add comment
    await client.query(`
      COMMENT ON COLUMN users.client_id IS 'For client_user role: links user to their client. NULL for broker staff roles.';
    `);

    console.log('🎉 Migration completed successfully!\n');
    console.log('Note: Existing client_user accounts will have NULL client_id.');
    console.log('You can associate them with clients using:');
    console.log('  UPDATE users SET client_id = \'<client-uuid>\' WHERE id = \'<user-uuid>\';\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
