import { Request, Response } from 'express';
import { supabase } from '../supabase';

export async function getConfigBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    if (!supabase) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('configurations')
      .select('config')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(data.config);
  } catch (e) {
    console.error('getConfigBySlug error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
