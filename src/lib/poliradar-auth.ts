import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from './supabase';

export function poliAuthRedirectTo(): string {
  if (typeof window === 'undefined') {
    return 'https://vientonorte.github.io/uxtools/app.html';
  }
  return `${window.location.origin}${window.location.pathname}`;
}

export function usePoliSession() {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setReady(true);
      return;
    }
    let cancelled = false;
    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { configured, ready, session };
}

export async function signInPoliMagicLink(email: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: poliAuthRedirectTo() },
  });
  if (error) throw error;
}

export async function signInPoliPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpPoliPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: poliAuthRedirectTo() },
  });
  if (error) throw error;
}

export async function signOutPoli() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
