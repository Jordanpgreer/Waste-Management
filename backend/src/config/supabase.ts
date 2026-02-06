import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not configured. File upload features will be unavailable.');
  console.warn('   Add SUPABASE_URL and SUPABASE_SERVICE_KEY to your .env file.');
}

// Create Supabase client with service role key for server-side operations
export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'vendor-invoices';

// Helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};
