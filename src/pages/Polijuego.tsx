import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PoliradarLogin } from '../components/PoliradarLogin';
import { QrShare } from '../components/QrShare';
import { signOutPoli, usePoliSession } from '../lib/poliradar-auth';
import { FIGMA_SITE, poliradarShareUrl } from '../lib/poliradar';
import '../styles/polijuego.css';

export default function Polijuego() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [shareUrl, setShareUrl] = useState(poliradarShareUrl);
  const [copied, setCopied] = useState(false);
  const [fsError, setFsError] = useState<string | null>(null);
  const { configured, ready, session } = usePoliSession();
  const canPlay = !configured || Boolean(session);

  useEffect(() => {
    setShareUrl(poliradarShareUrl());
    function onChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  async function toggleFullscreen() {
    setFsError(null);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const node = wrapRef.current;
      if (!node?.requestFullscreen) {
        window.open(FIGMA_SITE, '_blank', 'noopener,noreferrer');
        return;
      }
      await node.requestFullscreen();
    } catch {
      setFsError('Este navegador bloqueó pantalla completa. Abre el Figma Site en una pestaña.');
    }
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mr-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">Método Ro · Pareja / Grupo · Open Source</div>
        <h1 className="mr-title">PoliRadar</h1>
        <p className="mr-sub">
          RADAR · El Polijuego. Facilitación de vínculos éticos.
          Ciclo Rev → Aco → Deb → Acc → Rec. Comunicación · Compasión · Honestidad radical.
        </p>
      </header>

      <div className="mr-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        {canPlay ? (
          <a
            className="mr-btn mr-btn--primary"
            href={FIGMA_SITE}
            target="_blank"
            rel="noopener noreferrer"
          >
            Jugar en pareja / grupo ↗
          </a>
        ) : null}
        {canPlay ? (
          <button type="button" className="mr-btn" onClick={() => void toggleFullscreen()}>
            {fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        ) : null}
        <Link className="mr-btn" to="/selfradar">
          Self Radar — modo individual
        </Link>
        <Link className="mr-btn" to="/onboarding">
          Mapa de herramientas
        </Link>
        {session ? (
          <button type="button" className="mr-btn" onClick={() => void signOutPoli()}>
            Salir ({session.user.email})
          </button>
        ) : null}
      </div>

      <section className="mr-card">
        <h2 className="mr-card__title">Qué es</h2>
        <p style={{ margin: 0, lineHeight: 1.55 }}>
          <strong>PoliRadar</strong> es <strong>R.A.D.A.R. El Polijuego®</strong> en UX Tools:
          un juego de facilitación para vínculos éticos (pareja, grupo, poliamor,
          no-monogamia ética). El ciclo de cinco pasos (Revisión → Acordar → Debatir →
          Accionar → Reconectar) sostiene conversaciones con honestidad radical y cuidado mutuo.
        </p>
      </section>

      <section className="mr-card">
        <h2 className="mr-card__title">Ciclo RADAR</h2>
        <p className="mr-card__hint">Rev · Aco · Deb · Acc · Rec</p>
        <ol className="mr-rules">
          <li>
            <strong>Rev</strong> — Revisión: mirar lo que está vivo en el vínculo.
          </li>
          <li>
            <strong>Aco</strong> — Acordar: explicitar lo que se necesita y se ofrece.
          </li>
          <li>
            <strong>Deb</strong> — Debatir: sostener diferencias sin destruir el lazo.
          </li>
          <li>
            <strong>Acc</strong> — Accionar: traducir la conversación en hechos concretos.
          </li>
          <li>
            <strong>Rec</strong> — Reconectar: cerrar y volver al cuidado mutuo.
          </li>
        </ol>
      </section>

      {!ready ? (
        <section className="mr-card">
          <p className="mr-card__hint">Cargando sesión…</p>
        </section>
      ) : !canPlay ? (
        <PoliradarLogin />
      ) : (
        <section className="mr-card">
          <div className="poli-play-head">
            <h2 className="mr-card__title">Jugar aquí</h2>
            <button type="button" className="mr-btn mr-btn--primary" onClick={() => void toggleFullscreen()}>
              {fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            </button>
          </div>
          <div
            ref={wrapRef}
            className={`mr-embed${fullscreen ? ' is-fullscreen' : ''}`}
          >
            <iframe
              title="PoliRadar — RADAR El Polijuego"
              src={FIGMA_SITE}
              allow="fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          {fsError ? <p className="poli-warn">{fsError}</p> : null}
          <p style={{ margin: '0.85rem 0 0', fontSize: '0.9rem', opacity: 0.75 }}>
            Si el embed no carga, usa «Jugar en pareja / grupo» para abrir el Figma Site
            en una pestaña nueva.
          </p>
        </section>
      )}

      <section className="mr-card" id="compartir">
        <h2 className="mr-card__title">Compartir con QR</h2>
        <p style={{ margin: '0 0 0.85rem', lineHeight: 1.55 }}>
          Escanea para abrir PoliRadar en otro dispositivo. También puedes copiar el enlace.
        </p>
        <QrShare url={shareUrl} label="QR de PoliRadar" />
        <div className="mr-toolbar" style={{ marginTop: '0.85rem' }}>
          <button type="button" className="mr-btn mr-btn--primary" onClick={() => void copyShare()}>
            {copied ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
          <a className="mr-btn" href={shareUrl}>
            Abrir enlace de compartir
          </a>
        </div>
      </section>

      <section className="mr-card">
        <h2 className="mr-card__title">Complemento Método Ro</h2>
        <p style={{ margin: '0 0 0.75rem', lineHeight: 1.55 }}>
          <strong>Self Radar</strong> es el modo individual (review semanal de 7 ejes).
          PoliRadar es el modo relacional. Ambos viven bajo Método Ro / Bullet Ro.
        </p>
        <Link className="mr-btn" to="/selfradar">
          Ir a Self Radar →
        </Link>
      </section>

      <p className="mr-privacy">
        © 2026 RoMila™ · Camila Palma Soto & Rodrigo Gaete · Viento Norte ·{' '}
        CC BY-NC-SA 4.0 · Código abierto · No comercial
      </p>
    </main>
  );
}
