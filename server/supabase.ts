import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || '';

// Lazily create client; warn if missing env vars
if (!url || !key) {
  console.warn('[Supabase] SUPABASE_URL or KEY not set (SERVICE_ROLE or ANON). /api/config/:slug will return 503.');
}

export const supabase = url && key ? createClient(url, key) : (null as any);
