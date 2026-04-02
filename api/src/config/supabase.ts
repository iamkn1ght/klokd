import { createClient } from '@supabase/supabase-js';
import { config } from './index';

/**
 * Supabase client — uses service_role key for server-side operations.
 * Used for Storage (file uploads) and optionally as production database.
 */
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  { auth: { persistSession: false } }
);
