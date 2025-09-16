import { Request, Response } from 'express';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { sql as neonSql } from '../sql';

async function loadFromFile(slug: string) {
  try {
    const file = path.join(process.cwd(), 'data', 'configurations.json');
    const raw = await fs.readFile(file, 'utf-8');
    const list = JSON.parse(raw) as any[];
    const match = list.find((c) =>
      c && (
        (c.slug && c.slug === slug) ||
        c.previewUrl?.includes(`/site/${slug}`) ||
        c.publishedUrl?.includes(slug) ||
        c.selectedDomain === slug ||
        c.domainName === slug
      )
    );
    return match || null;
  } catch {
    return null;
  }
}

export async function getConfigBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    // Try Netlify Neon first (uses NETLIFY_DATABASE_URL)
    if (neonSql) {
      try {
        const mapRes = await neonSql`SELECT schema_name, restaurant_id FROM public.tenants WHERE tenant_slug = ${slug} LIMIT 1`;
        const mapping = mapRes && mapRes[0];
        if (mapping?.schema_name && mapping?.restaurant_id) {
          // Switch search_path so we can query unqualified table names safely
          await neonSql`SET search_path TO ${mapping.schema_name}`;
          const cfgRes = await neonSql`SELECT config_json FROM restaurants WHERE id = ${mapping.restaurant_id} LIMIT 1`;
          const row = cfgRes && cfgRes[0];
          if (row?.config_json) {
            return res.json(row.config_json);
          }
        }
      } catch (e) {
        console.error('Neon query failed in getConfigBySlug:', e);
      }
    }

    const databaseUrl =
      process.env.NETLIFY_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.SUPABASE_DB_URL ||
      '';

    if (databaseUrl) {
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 2,
      });
      const client = await pool.connect();
      try {
        // Lookup tenant mapping in public.tenants
        const mapRes = await client.query(
          `SELECT schema_name, restaurant_id FROM public.tenants WHERE tenant_slug = $1 LIMIT 1`,
          [slug]
        );
        const mapping = mapRes.rows[0];
        if (mapping?.schema_name && mapping?.restaurant_id) {
          await client.query(`SET search_path TO ${mapping.schema_name};`);
          const cfgRes = await client.query(
            `SELECT config_json FROM restaurants WHERE id = $1 LIMIT 1`,
            [mapping.restaurant_id]
          );
          const row = cfgRes.rows[0];
          if (row?.config_json) {
            return res.json(row.config_json);
          }
        }
      } catch (e) {
        console.error('DB read failed in getConfigBySlug:', e);
      } finally {
        client.release();
        try { await pool.end(); } catch {}
      }
    }

    // Fallback to file-based store (dev or read-only envs)
    const fromFile = await loadFromFile(slug);
    if (fromFile) return res.json(fromFile);

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('getConfigBySlug error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
