import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || '';

// Lazily create client; warn if missing env vars
if (!url || !anon) {
  console.warn('[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set. /api/config/:slug will return 503.');
}

export const supabase = url && anon ? createClient(url, anon) : (null as any);
