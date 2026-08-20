import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MrButton } from '../components/metodo-ro/MrButton';
import { MrCard } from '../components/metodo-ro/MrCard';
import {
  ONBOARD_LANGS,
  TOOL_LAYOUT,
  onboardCopy,
  type OnboardLang,
  type ToolId,
} from '../lib/onboarding-i18n';
import {
  isOnboardDone,
  loadOnboardLang,
  markOnboardDone,
  saveOnboardLang,
} from '../lib/onboarding-storage';
import '../styles/onboarding.css';

export default function Onboarding() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<OnboardLang>(loadOnboardLang);
  const [active, setActive] = useState<ToolId>('poliradar');
  const t = useMemo(() => onboardCopy(lang), [lang]);
  const layout = TOOL_LAYOUT.find((n) => n.id === active) ?? TOOL_LAYOUT[2];
  const tool = t.tools[active];

  function pickLang(next: OnboardLang) {
    setLang(next);
    saveOnboardLang(next);
  }

  function finish() {
    markOnboardDone();
    navigate('/');
  }

  function openTool() {
    markOnboardDone();
    if (layout.spa) {
      navigate(layout.href);
      return;
    }
    window.location.href = layout.href;
  }

  return (
    <main className="mr-main ob-main ob-main--map" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">{t.eyebrow}</div>
        <h1 className="mr-title">{t.title}</h1>
        <p className="mr-sub">{t.sub}</p>
      </header>

      <div className="ob-langs" role="radiogroup" aria-label={t.eyebrow}>
        {ONBOARD_LANGS.map((l) => (
          <label key={l.id} className={`ob-lang${lang === l.id ? ' is-on' : ''}`}>
            <input
              type="radio"
              name="ob-lang"
              checked={lang === l.id}
              onChange={() => pickLang(l.id)}
            />
            <span>{l.native}</span>
          </label>
        ))}
      </div>

      <section className="ob-map-wrap" aria-label={t.mapTitle}>
        <h2 className="ob-map-title">{t.mapTitle}</h2>
        <p className="ob-map-hint">{t.mapHint}</p>

        <div className="ob-map" role="group" aria-label={t.mapTitle}>
          <svg className="ob-map-lines" viewBox="0 0 800 800" preserveAspectRatio="none" aria-hidden="true">
            <line x1="400" y1="400" x2="400" y2="100" />
            <line x1="400" y1="400" x2="612" y2="188" />
            <line x1="400" y1="400" x2="700" y2="400" />
            <line x1="400" y1="400" x2="612" y2="612" />
            <line x1="400" y1="400" x2="400" y2="700" />
            <line x1="400" y1="400" x2="188" y2="612" />
            <line x1="400" y1="400" x2="100" y2="400" />
            <line x1="400" y1="400" x2="188" y2="188" />
          </svg>

          {TOOL_LAYOUT.map((node) => {
            const copy = t.tools[node.id];
            const on = active === node.id;
            return (
              <button
                key={node.id}
                type="button"
                className={`ob-nodo${on ? ' is-on' : ''}${node.featured ? ' is-featured' : ''}`}
                style={{ top: node.top, left: node.left }}
                aria-pressed={on}
                aria-label={`${copy.voc}. ${copy.name}`}
                onClick={() => setActive(node.id)}
              >
                <span className="ob-nodo-icon" aria-hidden="true">
                  {node.icon}
                </span>
                <span className="ob-nodo-label">{copy.voc}</span>
              </button>
            );
          })}

          <div className="ob-centro" aria-hidden="true">
            <div className="ob-yo">{t.centerYou}</div>
            <div className="ob-yo-name">UX Tools</div>
            <div className="ob-yo-age">{t.centerAge}</div>
          </div>
        </div>

        <ul className="ob-map-list">
          {TOOL_LAYOUT.map((node) => {
            const copy = t.tools[node.id];
            const on = active === node.id;
            return (
              <li key={`m-${node.id}`}>
                <button
                  type="button"
                  className={`ob-nodo-row${on ? ' is-on' : ''}${node.featured ? ' is-featured' : ''}`}
                  aria-pressed={on}
                  onClick={() => setActive(node.id)}
                >
                  <span aria-hidden="true">{node.icon}</span>
                  <span>
                    <strong>{copy.voc}</strong>
                    <em>{copy.name}</em>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <MrCard
        title={tool.name}
        hint={layout.featured ? t.featured : tool.voc}
      >
        <p className="ob-p">
          <strong>{tool.voc}.</strong> {tool.job}
        </p>
        <div className="mr-toolbar">
          <MrButton variant="primary" onClick={openTool}>
            {t.open} →
          </MrButton>
          {layout.featured ? (
            <Link className="mr-btn" to="/poliradar">
              {t.poliCta}
            </Link>
          ) : null}
        </div>
      </MrCard>

      <div className="mr-toolbar ob-nav">
        <MrButton variant="primary" onClick={finish}>
          {t.start}
        </MrButton>
        <Link className="mr-btn" to="/" onClick={() => markOnboardDone()}>
          {t.skip}
        </Link>
      </div>

      <p className="mr-privacy">{t.privacy}</p>
      {isOnboardDone() ? (
        <p className="mr-privacy">Onboarding ya marcado en este dispositivo.</p>
      ) : null}
    </main>
  );
}
