import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = REPLACE_ENV.https://bkkdnflmymogmcqnfeer.supabase.co || process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON = REPLACE_ENV.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    storageKey: 'sb:session',
  },
});

export default supabaseClient;