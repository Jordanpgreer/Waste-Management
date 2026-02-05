import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
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

const seedUsers = async () => {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting user seed...\n');

    // 1. Create organization
    console.log('📊 Creating organization...');
    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, email, phone, address, city, state, zip, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, slug`,
      [
        'Demo Waste Management Co',
        'demo-waste-mgmt',
        'admin@demowaste.com',
        '555-0100',
        '123 Main Street',
        'Portland',
        'Oregon',
        '97201',
        true,
      ]
    );

    const org = orgResult.rows[0];
    console.log(`✅ Created organization: ${org.name} (ID: ${org.id})\n`);

    // 2. Create admin user (you)
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('Admin123!@#', 10);
    const adminResult = await client.query(
      `INSERT INTO users (org_id, email, password_hash, first_name, last_name, phone, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, first_name, last_name, role`,
      [
        org.id,
        'admin@demowaste.com',
        adminPassword,
        'Admin',
        'User',
        '555-0101',
        'admin',
        true,
        true,
      ]
    );

    const admin = adminResult.rows[0];
    console.log(`✅ Created admin user:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: Admin123!@#`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin.id}\n`);

    // 3. Create test regular user
    console.log('👤 Creating test regular user...');
    const userPassword = await bcrypt.hash('Test123!@#', 10);
    const userResult = await client.query(
      `INSERT INTO users (org_id, email, password_hash, first_name, last_name, phone, role, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, email, first_name, last_name, role`,
      [
        org.id,
        'test@demowaste.com',
        userPassword,
        'Test',
        'User',
        '555-0102',
        'client_user',
        true,
        true,
      ]
    );

    const testUser = userResult.rows[0];
    console.log(`✅ Created test user:`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: Test123!@#`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   ID: ${testUser.id}\n`);

    // 4. Create additional test users with different roles
    console.log('👥 Creating additional role-specific users...\n');

    const roles = [
      { email: 'broker@demowaste.com', firstName: 'Broker', lastName: 'Agent', role: 'broker_ops_agent', phone: '555-0103' },
      { email: 'account@demowaste.com', firstName: 'Account', lastName: 'Manager', role: 'account_manager', phone: '555-0104' },
      { email: 'billing@demowaste.com', firstName: 'Billing', lastName: 'Specialist', role: 'billing_finance', phone: '555-0105' },
    ];

    for (const roleUser of roles) {
      const rolePassword = await bcrypt.hash('Test123!@#', 10);
      const roleResult = await client.query(
        `INSERT INTO users (org_id, email, password_hash, first_name, last_name, phone, role, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING email, role`,
        [
          org.id,
          roleUser.email,
          rolePassword,
          roleUser.firstName,
          roleUser.lastName,
          roleUser.phone,
          roleUser.role,
          true,
          true,
        ]
      );

      console.log(`✅ Created ${roleResult.rows[0].role}: ${roleResult.rows[0].email}`);
    }

    console.log('\n🎉 User seeding complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔑 ADMIN USER:');
    console.log(`   Email: admin@demowaste.com`);
    console.log(`   Password: Admin123!@#`);
    console.log(`   Organization ID: ${org.id}\n`);
    console.log('🔑 TEST USER (Client):');
    console.log(`   Email: test@demowaste.com`);
    console.log(`   Password: Test123!@#`);
    console.log(`   Organization ID: ${org.id}\n`);
    console.log('🔑 OTHER TEST USERS:');
    console.log(`   broker@demowaste.com - Password: Test123!@#`);
    console.log(`   account@demowaste.com - Password: Test123!@#`);
    console.log(`   billing@demowaste.com - Password: Test123!@#\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 You can now login at: http://localhost:3000');
    console.log('📡 API endpoint: http://localhost:5000/api/v1/auth/login\n');

  } catch (error: any) {
    console.error('❌ Error seeding users:', error.message);
    if (error.code === '23505') {
      console.error('\n⚠️  Users already exist. To re-seed, first run:');
      console.error('   DELETE FROM users; DELETE FROM organizations;');
      console.error('   in the Supabase SQL Editor\n');
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seedUsers();
