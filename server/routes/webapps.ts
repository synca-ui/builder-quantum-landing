import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { sql } from '../sql';

export const webAppsRouter = Router();

// All below routes require auth
webAppsRouter.use(requireAuth);

webAppsRouter.get('/apps', async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = await sql`SELECT id, user_id, subdomain, config_data, published_at, updated_at FROM public.web_apps WHERE user_id=${userId} ORDER BY updated_at DESC`;
    return res.json({ apps: rows });
  } catch (e) {
    console.error('get apps error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

webAppsRouter.get('/apps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const rows = await sql`SELECT id, user_id, subdomain, config_data, published_at, updated_at FROM public.web_apps WHERE id=${id} AND user_id=${userId} LIMIT 1`;
    const app = rows[0];
    if (!app) return res.status(404).json({ error: 'Not found' });
    return res.json(app);
  } catch (e) {
    console.error('get app error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

webAppsRouter.post('/apps/publish', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { subdomain, config } = req.body || {};
    if (!subdomain || !config) return res.status(400).json({ error: 'Missing subdomain or config' });
    const rows = await sql`INSERT INTO public.web_apps(user_id, subdomain, config_data)
                          VALUES(${userId}, ${subdomain}, ${sql.json(config)})
                          ON CONFLICT (subdomain) DO UPDATE SET config_data=EXCLUDED.config_data, updated_at=now()
                          RETURNING id, user_id, subdomain, config_data, published_at, updated_at`;
    return res.json(rows[0]);
  } catch (e) {
    console.error('publish app error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

webAppsRouter.put('/apps/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { config } = req.body || {};
    if (!config) return res.status(400).json({ error: 'Missing config' });
    const rows = await sql`UPDATE public.web_apps SET config_data=${sql.json(config)}, updated_at=now() WHERE id=${id} AND user_id=${userId} RETURNING id, user_id, subdomain, config_data, published_at, updated_at`;
    const app = rows[0];
    if (!app) return res.status(404).json({ error: 'Not found' });
    return res.json(app);
  } catch (e) {
    console.error('update app error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public endpoint (no auth)
export const publicAppsRouter = Router();
publicAppsRouter.get('/public/apps/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const rows = await sql`SELECT config_data FROM public.web_apps WHERE subdomain=${subdomain} LIMIT 1`;
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ config: row.config_data });
  } catch (e) {
    console.error('public app error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
