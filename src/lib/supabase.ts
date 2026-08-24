import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

/** HashRouter keeps routes in `#`. Magic-link `code` lands on app.html search. */
export async function consumeAuthCallback(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const sb = getSupabase();
  if (!sb) return false;

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hasAuth =
    params.has('code') ||
    params.has('access_token') ||
    hashParams.has('access_token') ||
    hashParams.has('refresh_token');
  if (!hasAuth) return false;

  const { error } = await sb.auth.getSession();
  if (error) return false;

  const next = `${window.location.pathname}#/poliradar`;
  window.history.replaceState({}, document.title, next);
  return true;
}
