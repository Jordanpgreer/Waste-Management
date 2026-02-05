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

const setupTestClient = async () => {
  const client = await pool.connect();

  try {
    console.log('🏢 Setting up test client data...\n');

    // Get the organization ID
    const orgResult = await client.query(
      `SELECT id FROM organizations WHERE slug = 'demo-waste-mgmt' LIMIT 1`
    );

    if (orgResult.rows.length === 0) {
      console.error('❌ Organization not found. Please run seed-users first.');
      process.exit(1);
    }

    const orgId = orgResult.rows[0].id;

    // Create a test client business
    console.log('📝 Creating test client business...');
    const clientResult = await client.query(
      `INSERT INTO clients (org_id, name, legal_name, industry, email, phone, billing_email, billing_address, billing_city, billing_state, billing_zip, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [
        orgId,
        'GreenLeaf Grocery Store',
        'GreenLeaf Grocery Inc.',
        'Retail - Grocery',
        'contact@greenleafgrocery.com',
        '555-2000',
        'billing@greenleafgrocery.com',
        '789 Market Street',
        'Portland',
        'Oregon',
        '97202',
        true,
      ]
    );

    let clientId;
    if (clientResult.rows.length > 0) {
      clientId = clientResult.rows[0].id;
      console.log(`✅ Created client: ${clientResult.rows[0].name} (ID: ${clientId})\n`);
    } else {
      // Client might already exist, fetch it
      const existingClient = await client.query(
        `SELECT id, name FROM clients WHERE org_id = $1 AND name = 'GreenLeaf Grocery Store' LIMIT 1`,
        [orgId]
      );
      if (existingClient.rows.length > 0) {
        clientId = existingClient.rows[0].id;
        console.log(`✅ Using existing client: ${existingClient.rows[0].name} (ID: ${clientId})\n`);
      }
    }

    if (!clientId) {
      console.error('❌ Failed to create or find client');
      process.exit(1);
    }

    // Create a site for this client
    console.log('📝 Creating site for client...');
    const siteResult = await client.query(
      `INSERT INTO client_sites (org_id, client_id, name, address, city, state, zip, site_manager_name, site_manager_phone, site_manager_email, operating_hours, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [
        orgId,
        clientId,
        'GreenLeaf Downtown Location',
        '789 Market Street',
        'Portland',
        'Oregon',
        '97202',
        'Sarah Johnson',
        '555-2001',
        'sarah@greenleafgrocery.com',
        'Mon-Sat 8AM-9PM, Sun 9AM-7PM',
        true,
      ]
    );

    if (siteResult.rows.length > 0) {
      console.log(`✅ Created site: ${siteResult.rows[0].name} (ID: ${siteResult.rows[0].id})\n`);
    } else {
      console.log('✅ Site already exists\n');
    }

    // Associate the test user with this client
    console.log('📝 Associating test user with client...');
    const userUpdate = await client.query(
      `UPDATE users
       SET client_id = $1
       WHERE email = 'test@demowaste.com' AND role = 'client_user'
       RETURNING id, email, first_name, last_name, client_id`,
      [clientId]
    );

    if (userUpdate.rows.length > 0) {
      const user = userUpdate.rows[0];
      console.log(`✅ Associated user: ${user.email} with client (client_id: ${user.client_id})\n`);
    }

    // Create a few test tickets for this client
    console.log('📝 Creating test tickets for client...');
    const ticketResult = await client.query(
      `INSERT INTO tickets (org_id, ticket_number, client_id, ticket_type, status, priority, subject, description)
       VALUES
         ($1, 'TKT-' || to_char(now(), 'YYYYMMDD') || '-001', $2, 'missed_pickup', 'new', 'high', 'Missed pickup on Tuesday', 'Our regular Tuesday pickup was missed. Dumpster is overflowing.'),
         ($1, 'TKT-' || to_char(now(), 'YYYYMMDD') || '-002', $2, 'extra_pickup', 'triaged', 'medium', 'Extra pickup needed', 'We have extra cardboard boxes from inventory delivery. Need extra pickup.'),
         ($1, 'TKT-' || to_char(now(), 'YYYYMMDD') || '-003', $2, 'container_swap', 'completed', 'low', 'Replace damaged container', 'Container #3 has a broken lid, needs replacement.')
       ON CONFLICT (ticket_number) DO NOTHING
       RETURNING id, ticket_number, subject`,
      [orgId, clientId]
    );

    console.log(`✅ Created ${ticketResult.rows.length} test tickets\n`);
    ticketResult.rows.forEach((ticket) => {
      console.log(`   - ${ticket.ticket_number}: ${ticket.subject}`);
    });

    console.log('\n🎉 Test client setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TEST CLIENT INFORMATION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🏢 Client: GreenLeaf Grocery Store');
    console.log(`   ID: ${clientId}`);
    console.log('   Industry: Retail - Grocery\n');
    console.log('👤 Test User (Client Portal):');
    console.log('   Email: test@demowaste.com');
    console.log('   Password: Test123!@#');
    console.log('   Role: client_user');
    console.log(`   Associated Client ID: ${clientId}\n`);
    console.log('📍 Site: GreenLeaf Downtown Location');
    console.log('   Address: 789 Market Street, Portland, OR 97202\n');
    console.log('🎫 Test Tickets: 3 tickets created');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Login as test@demowaste.com to see ONLY GreenLeaf data\n');

  } catch (error: any) {
    console.error('❌ Error setting up test client:', error.message);
    if (error.code === '23505') {
      console.log('\n✅ Test data already exists, skipping...\n');
    } else {
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
};

setupTestClient();
