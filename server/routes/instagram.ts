import { RequestHandler } from 'express';

export const fetchInstagramPhotos: RequestHandler = async (req, res) => {
  try {
    const profileUrl = (req.query.profileUrl as string) || '';
    if (!profileUrl) return res.status(400).json({ error: 'profileUrl query required' });

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
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{.+?\})<\/script>/s);
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

    // Fallback: attempt to extract JSON from scripts containing "profile_pic_url" or other markers
    if (images.length === 0) {
      const jsonMatch = html.match(/<script type="text\/javascript">\s*window\.__additionalDataLoaded\('[^']+',\s*(\{.+?\})\);<\/script>/s);
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
      const metaMatch = html.match(/<meta property="og:image" content="([^"]+)"\s*\/?>/i);
      if (metaMatch && metaMatch[1]) images = [metaMatch[1]];
    }

    return res.json(images);
  } catch (error) {
    console.error('Instagram fetch error', error);
    return res.status(500).json({ error: 'Instagram fetch failed' });
  }
};
