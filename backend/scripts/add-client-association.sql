-- Migration: Add client association to users table
-- This allows client_user roles to be associated with specific clients
-- so they only see their own data

-- Add client_id column to users table
ALTER TABLE users ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_users_client_id ON users(client_id);

-- Add comment
COMMENT ON COLUMN users.client_id IS 'For client_user role: links user to their client. NULL for broker staff roles.';
