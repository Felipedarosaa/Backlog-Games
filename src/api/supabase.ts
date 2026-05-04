import AsyncStorage from '@react-native-async-storage/async-storage';
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

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : createClient('http://localhost', 'invalid', {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
