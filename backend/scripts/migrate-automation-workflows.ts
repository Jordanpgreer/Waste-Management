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
    console.log('Starting migration: automation_workflows table...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_workflows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        ticket_type ticket_type NOT NULL,
        trigger_event VARCHAR(50) NOT NULL DEFAULT 'ticket_created',
        is_active BOOLEAN NOT NULL DEFAULT true,
        steps JSONB NOT NULL DEFAULT '[]',
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_automation_workflows_org_id
      ON automation_workflows(org_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_automation_workflows_ticket_type
      ON automation_workflows(ticket_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_automation_workflows_is_active
      ON automation_workflows(is_active);
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_automation_workflows_updated_at ON automation_workflows;
    `);
    await client.query(`
      CREATE TRIGGER update_automation_workflows_updated_at
      BEFORE UPDATE ON automation_workflows
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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

