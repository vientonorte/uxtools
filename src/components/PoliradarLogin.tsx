import { useState, type FormEvent } from 'react';
import {
  signInPoliMagicLink,
  signInPoliPassword,
  signUpPoliPassword,
} from '../lib/poliradar-auth';

type Mode = 'magic' | 'password';

export function PoliradarLogin() {
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'magic') {
        await signInPoliMagicLink(email.trim());
        setSent(true);
        return;
      }
      await signInPoliPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp() {
    setError(null);
    setBusy(true);
    try {
      await signUpPoliPassword(email.trim(), password);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mr-card" aria-labelledby="poli-login-title">
      <h2 className="mr-card__title" id="poli-login-title">
        Entrar para jugar
      </h2>
      <p className="mr-card__hint">
        PoliRadar guarda la partida en tu cuenta. Magic link al correo, o email y clave.
      </p>
      {sent ? (
        <p className="poli-login__ok">
          Revisa el correo y abre el enlace para volver a PoliRadar.
        </p>
      ) : (
        <form className="poli-login" onSubmit={(e) => void onSubmit(e)}>
          <label className="poli-login__label" htmlFor="poli-email">
            Email
          </label>
          <input
            id="poli-email"
            className="poli-login__input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode === 'password' ? (
            <>
              <label className="poli-login__label" htmlFor="poli-password">
                Clave
              </label>
              <input
                id="poli-password"
                className="poli-login__input"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          ) : null}
          {error ? <p className="poli-warn" role="alert">{error}</p> : null}
          <div className="mr-toolbar" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
            <button type="submit" className="mr-btn mr-btn--primary" disabled={busy}>
              {busy ? 'Enviando…' : mode === 'magic' ? 'Enviar magic link' : 'Entrar'}
            </button>
            {mode === 'password' ? (
              <button
                type="button"
                className="mr-btn"
                disabled={busy || !email || password.length < 8}
                onClick={() => void onSignUp()}
              >
                Crear cuenta
              </button>
            ) : null}
            <button
              type="button"
              className="mr-btn"
              onClick={() => {
                setMode(mode === 'magic' ? 'password' : 'magic');
                setError(null);
                setSent(false);
              }}
            >
              {mode === 'magic' ? 'Usar email y clave' : 'Usar magic link'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
