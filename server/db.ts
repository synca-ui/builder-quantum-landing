import { neon } from "@netlify/neon";
import { Pool } from "pg";
import { Client as NeonServerlessClient } from "@neondatabase/serverless";

// Singleton Pool — erstellt nur einmal, nicht pro Aufruf
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,          // Max simultane Verbindungen
      idleTimeoutMillis: 30_000,
    });
  }
  return _pool;
}

export function getSql() {
  try {
    return neon();
  } catch {
    const conn =
      process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
    if (conn) {
      // serverless client (Netlify/Edge)
      const client = new (NeonServerlessClient as any)(conn);
      return async (strings: TemplateStringsArray, ...values: any[]) => {
        const text = strings.reduce(
          (acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ""),
          "",
        );
        const params = values.map((v) =>
          typeof v === "object" ? JSON.stringify(v) : v,
        );
        const result = await client.query(text, params);
        return result.rows;
      };
    }
    // Fallback: wiederverwende den Singleton-Pool (kein neuer Pool pro Aufruf)
    const pool = getPool();
    return async (strings: TemplateStringsArray, ...values: any[]) => {
      const client = await pool.connect();
      try {
        const text = strings.reduce(
          (acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ""),
          "",
        );
        const result = await client.query(text, values);
        return result.rows;
      } finally {
        client.release();
      }
    };
  }
}
