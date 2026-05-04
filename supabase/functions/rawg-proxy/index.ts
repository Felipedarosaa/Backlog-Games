import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

type SearchBody = { action: 'search'; query: string };
type DetailsBody = { action: 'details'; rawgId: number };

const RAWG_API_KEY = Deno.env.get('RAWG_API_KEY') ?? '';
const BASE_URL = 'https://api.rawg.io/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  if (!RAWG_API_KEY) {
    return Response.json({ error: 'RAWG_API_KEY not configured' }, { status: 500, headers: corsHeaders });
  }

  let body: any = undefined;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  try {
    if (body?.action === 'search') {
      const b = body as SearchBody;
      const query = String(b.query ?? '').trim();
      if (!query) return Response.json({ count: 0, results: [] }, { status: 200, headers: corsHeaders });
      const url =
        `${BASE_URL}/games?key=${encodeURIComponent(RAWG_API_KEY)}` +
        `&search=${encodeURIComponent(query)}` +
        `&page_size=10&search_precise=true`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : `RAWG error (HTTP ${res.status})`;
        return Response.json({ error: msg }, { status: 502, headers: corsHeaders });
      }
      return Response.json(data, { status: 200, headers: corsHeaders });
    }

    if (body?.action === 'details') {
      const b = body as DetailsBody;
      const rawgId = Number(b.rawgId);
      if (!Number.isFinite(rawgId)) {
        return Response.json({ error: 'Invalid rawgId' }, { status: 400, headers: corsHeaders });
      }
      const url = `${BASE_URL}/games/${rawgId}?key=${encodeURIComponent(RAWG_API_KEY)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : `RAWG error (HTTP ${res.status})`;
        return Response.json({ error: msg }, { status: 502, headers: corsHeaders });
      }
      return Response.json(data, { status: 200, headers: corsHeaders });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
  } catch {
    return Response.json({ error: 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});

