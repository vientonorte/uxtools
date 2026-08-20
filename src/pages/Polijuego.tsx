import { Link } from 'react-router-dom';
import '../styles/polijuego.css';

const FIGMA_SITE = 'https://trill-scheme-71219616.figma.site/';

export default function Polijuego() {
  return (
    <main className="mr-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">Método Ro · Pareja / Grupo · Open Source</div>
        <h1 className="mr-title">RADAR · El Polijuego</h1>
        <p className="mr-sub">
          Facilitación de vínculos éticos. Ciclo Rev → Aco → Deb → Acc → Rec.
          Comunicación · Compasión · Honestidad radical.
        </p>
      </header>

      <div className="mr-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <a
          className="mr-btn mr-btn--primary"
          href={FIGMA_SITE}
          target="_blank"
          rel="noopener noreferrer"
        >
          Jugar en pareja / grupo ↗
        </a>
        <Link className="mr-btn" to="/selfradar">
          Self Radar — modo individual
        </Link>
        <a
          className="mr-btn"
          href={FIGMA_SITE}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir Figma Site ↗
        </a>
      </div>

      <section className="mr-card">
        <h2 className="mr-card__title">Qué es</h2>
        <p style={{ margin: 0, lineHeight: 1.55 }}>
          <strong>R.A.D.A.R. El Polijuego®</strong> es un juego de facilitación para
          vínculos éticos (pareja, grupo, poliamor, no-monogamia ética). El ciclo de
          cinco pasos (Revisión → Acordar → Debatir → Accionar → Reconectar) sostiene
          conversaciones con honestidad radical y cuidado mutuo.
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

      <section className="mr-card">
        <h2 className="mr-card__title">Jugar aquí</h2>
        <div className="mr-embed">
          <iframe
            title="RADAR El Polijuego — Figma Site"
            src={FIGMA_SITE}
            allow="fullscreen"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p style={{ margin: '0.85rem 0 0', fontSize: '0.9rem', opacity: 0.75 }}>
          Si el embed no carga, usa el botón «Jugar en pareja / grupo» para abrir el
          Figma Site en una pestaña nueva.
        </p>
      </section>

      <section className="mr-card">
        <h2 className="mr-card__title">Complemento Método Ro</h2>
        <p style={{ margin: '0 0 0.75rem', lineHeight: 1.55 }}>
          <strong>Self Radar</strong> es el modo individual (review semanal de 7 ejes).
          El Polijuego es el modo relacional. Ambos viven bajo Método Ro / Bullet Ro.
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
