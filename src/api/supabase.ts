import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(input: string) {
  const v = String(input ?? '').trim();
  if (!v) return '';
  if (/^[a-z0-9]{20}$/i.test(v) && !v.includes('.')) return `https://${v}.supabase.co`;
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

function stripRestPath(url: string) {
  return url.replace(/\/rest\/v1\/?$/i, '');
}

const supabaseUrl = stripRestPath(normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''));
const supabaseAnonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: async (key: string) => {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem: async (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: async (key: string) => {
      map.delete(key);
    },
  };
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: createMemoryStorage(),
          autoRefreshToken: true,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : createClient('http://localhost', 'invalid', {
        auth: {
          storage: createMemoryStorage(),
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
