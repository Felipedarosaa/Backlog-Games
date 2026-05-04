import { hasSupabaseConfig, supabase } from './supabase';

export type RawgGameSearchItem = {
  id: number;
  name: string;
  background_image?: string | null;
  released?: string | null;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
  metacritic?: number | null;
};

export type RawgGameDetails = RawgGameSearchItem & {
  description_raw?: string | null;
};

export type RawgSearchResponse = {
  count: number;
  results: RawgGameSearchItem[];
};

export class RawgError extends Error {
  readonly code: 'NO_API_KEY' | 'NOT_FOUND' | 'NETWORK' | 'BAD_RESPONSE';
  constructor(code: RawgError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const BASE_URL = 'https://api.rawg.io/api';

export async function rawgSearchGames(query: string, apiKey?: string) {
  const q = String(query ?? '').trim();
  if (!q) return [];
  if (apiKey) {
    const url = `${BASE_URL}/games?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(
      q,
    )}&page_size=10&search_precise=true`;
    const data = await fetchJson<RawgSearchResponse>(url);
    return data.results ?? [];
  }
  const data = await invokeProxy<RawgSearchResponse>({ action: 'search', query: q });
  return data.results ?? [];
}

export async function rawgGetGameDetails(rawgId: number, apiKey?: string) {
  const id = Number(rawgId);
  if (!Number.isFinite(id)) throw new RawgError('BAD_RESPONSE', 'ID inválido.');
  if (apiKey) {
    const url = `${BASE_URL}/games/${id}?key=${encodeURIComponent(apiKey)}`;
    const data = await fetchJson<RawgGameDetails>(url);
    if (!data?.id) throw new RawgError('NOT_FOUND', 'Jogo não encontrado na API.');
    return data;
  }
  const data = await invokeProxy<RawgGameDetails>({ action: 'details', rawgId: id });
  if (!data?.id) throw new RawgError('NOT_FOUND', 'Jogo não encontrado na API.');
  return data;
}

async function invokeProxy<T>(body: { action: 'search'; query: string } | { action: 'details'; rawgId: number }) {
  if (!hasSupabaseConfig()) throw new RawgError('NO_API_KEY', 'Supabase não configurado.');
  const { data, error } = await supabase.functions.invoke('rawg-proxy', { body });
  if (error) throw new RawgError('BAD_RESPONSE', error.message);
  return data as T;
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new RawgError('NETWORK', 'Falha de rede ao consultar a API.');
  }

  if (!res.ok) {
    let body: any = undefined;
    try {
      body = await res.json();
    } catch {}
    const msg =
      typeof body?.error === 'string'
        ? body.error
        : `Falha na API (HTTP ${res.status}).`;
    throw new RawgError('BAD_RESPONSE', msg);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new RawgError('BAD_RESPONSE', 'Resposta inválida da API.');
  }
}
