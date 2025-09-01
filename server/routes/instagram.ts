import { RequestHandler } from 'express';

// Simple in-memory cache with TTL
const cache = new Map<string, { data: string[]; ts: number }>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizeProfileUrl(input: string): string | null {
  let s = (input || '').trim();
  if (!s) return null;
  if (s.startsWith('@')) s = s.slice(1);
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/^\//, '');
  return `https://www.instagram.com/${s}/`;
}

export const fetchInstagramPhotos: RequestHandler = async (req, res) => {
  try {
    const raw = (req.query.profileUrl as string) || '';
    const profileUrl = normalizeProfileUrl(raw);
    if (!profileUrl) return res.status(400).json({ error: 'profileUrl query required' });

    const now = Date.now();
    const cached = cache.get(profileUrl);
    if (cached && now - cached.ts < TTL_MS) {
      return res.json(cached.data);
    }

    // Basic fetch using server environment - set user-agent to avoid simple blocks
    const resp = await fetch(profileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
        Accept: 'text/html',
      },
    });

    if (!resp.ok) return res.status(502).json({ error: 'Failed to fetch Instagram profile' });

    const html = await resp.text();

    // Try to locate JSON data embedded on the page (window._sharedData)
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]*?\})<\/script>/);
    let images: string[] = [];

    if (sharedDataMatch && sharedDataMatch[1]) {
      try {
        const json = JSON.parse(sharedDataMatch[1]);
        const edges =
          json?.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges || [];
        images = edges
          .map((e: any) => e?.node?.display_url || e?.node?.thumbnail_src)
          .filter(Boolean)
          .slice(0, 12);
      } catch (e) {
        // fallthrough
      }
    }

    // Fallback: attempt to extract JSON from scripts containing additional data
    if (images.length === 0) {
      const jsonMatch = html.match(/<script[^>]*>\s*window\.__additionalDataLoaded\('[^']+',\s*(\{[\s\S]*?\})\);\s*<\/script>/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const json = JSON.parse(jsonMatch[1]);
          const edges = json?.graphql?.user?.edge_owner_to_timeline_media?.edges || [];
          images = edges
            .map((e: any) => e?.node?.display_url || e?.node?.thumbnail_src)
            .filter(Boolean)
            .slice(0, 12);
        } catch (e) {
          // ignore
        }
      }
    }

    // As last resort, look for og:image meta tags (single image)
    if (images.length === 0) {
      const metaMatch = html.match(/<meta property=\"og:image\" content=\"([^\"]+)\"\s*\/?\s*>/i);
      if (metaMatch && metaMatch[1]) images = [metaMatch[1]];
    }

    cache.set(profileUrl, { data: images, ts: now });
    return res.json(images);
  } catch (error) {
    console.error('Instagram fetch error', error);
    return res.status(500).json({ error: 'Instagram fetch failed' });
  }
};
