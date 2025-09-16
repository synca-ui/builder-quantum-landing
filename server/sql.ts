import { neon } from '@netlify/neon';

let neonSql: ReturnType<typeof neon> | null = null;
try {
  // Uses NETLIFY_DATABASE_URL automatically on Netlify
  neonSql = neon();
} catch {
  neonSql = null;
}

export const sql = neonSql;
