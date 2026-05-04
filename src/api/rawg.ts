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
  if (!apiKey) throw new RawgError('NO_API_KEY', 'Configure sua RAWG API Key nas Configurações.');
  const url = `${BASE_URL}/games?key=${encodeURIComponent(apiKey)}&search=${encodeURIComponent(
    query,
  )}&page_size=10&search_precise=true`;
  const data = await fetchJson<RawgSearchResponse>(url);
  return data.results ?? [];
}

export async function rawgGetGameDetails(rawgId: number, apiKey?: string) {
  if (!apiKey) throw new RawgError('NO_API_KEY', 'Configure sua RAWG API Key nas Configurações.');
  const url = `${BASE_URL}/games/${rawgId}?key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson<RawgGameDetails>(url);
  if (!data?.id) throw new RawgError('NOT_FOUND', 'Jogo não encontrado na API.');
  return data;
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
