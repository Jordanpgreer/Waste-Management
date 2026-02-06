-- Seed Data for Test Users
-- Run this AFTER running schema.sql

-- Insert organization
INSERT INTO organizations (id, name, slug, email, phone)
VALUES (
  '2c2374d0-ed54-4de7-859f-365f0e191b7d',
  'Demo Waste Management Co',
  'demo-waste-mgmt',
  'info@demowaste.com',
  '555-0100'
) ON CONFLICT (id) DO NOTHING;

-- Insert test users
-- Note: Passwords are hashed with bcrypt

-- Admin User
INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, email_verified, is_active)
VALUES (
  uuid_generate_v4(),
  '2c2374d0-ed54-4de7-859f-365f0e191b7d',
  'admin@demowaste.com',
  '$2b$10$rCjkro4YZkQynoXAC3P4A.gm0GmHJQl.GtEqJE0/05c.HudoY4fku', -- password: Admin123!@#
  'Admin',
  'User',
  'admin',
  true,
  true
) ON CONFLICT (org_id, email) DO NOTHING;

-- Regular Client User
INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, email_verified, is_active)
VALUES (
  uuid_generate_v4(),
  '2c2374d0-ed54-4de7-859f-365f0e191b7d',
  'test@demowaste.com',
  '$2b$10$c6xLgK4LzpEnbRyiB7DOGeElIDGCKTnNwBWIUNkAicsbedBTsO2GK', -- password: Test123!@#
  'Test',
  'User',
  'client_user',
  true,
  true
) ON CONFLICT (org_id, email) DO NOTHING;

-- Broker Operations Agent
INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, email_verified, is_active)
VALUES (
  uuid_generate_v4(),
  '2c2374d0-ed54-4de7-859f-365f0e191b7d',
  'broker@demowaste.com',
  '$2b$10$c6xLgK4LzpEnbRyiB7DOGeElIDGCKTnNwBWIUNkAicsbedBTsO2GK', -- password: Test123!@#
  'Broker',
  'Agent',
  'broker_ops_agent',
  true,
  true
) ON CONFLICT (org_id, email) DO NOTHING;

-- Account Manager
INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, email_verified, is_active)
VALUES (
  uuid_generate_v4(),
  '2c2374d0-ed54-4de7-859f-365f0e191b7d',
  'account@demowaste.com',
  '$2b$10$c6xLgK4LzpEnbRyiB7DOGeElIDGCKTnNwBWIUNkAicsbedBTsO2GK', -- password: Test123!@#
  'Account',
  'Manager',
  'account_manager',
  true,
  true
) ON CONFLICT (org_id, email) DO NOTHING;

-- Billing/Finance User
INSERT INTO users (id, org_id, email, password_hash, first_name, last_name, role, email_verified, is_active)
VALUES (
  uuid_generate_v4(),
  '2c2374d0-ed54-4de7-859f-365f0e191b7d',
  'billing@demowaste.com',
  '$2b$10$c6xLgK4LzpEnbRyiB7DOGeElIDGCKTnNwBWIUNkAicsbedBTsO2GK', -- password: Test123!@#
  'Billing',
  'Finance',
  'billing_finance',
  true,
  true
) ON CONFLICT (org_id, email) DO NOTHING;

-- Success message
SELECT 'Database seeded successfully!' AS message;
SELECT COUNT(*) AS total_users FROM users;
