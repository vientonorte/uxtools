import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MrButton } from '../components/metodo-ro/MrButton';
import { MrCard } from '../components/metodo-ro/MrCard';
import { QrShare } from '../components/QrShare';
import {
  ONBOARD_LANGS,
  TOOL_LAYOUT,
  onboardCopy,
  type OnboardLang,
  type ToolId,
} from '../lib/onboarding-i18n';
import { poliradarShareUrl } from '../lib/poliradar';
import {
  isOnboardDone,
  loadOnboardLang,
  loadSelectedTool,
  loadStamps,
  markOnboardDone,
  saveOnboardLang,
  saveSelectedTool,
  saveStamp,
} from '../lib/onboarding-storage';
import '../styles/onboarding.css';

function hrefOf(id: ToolId) {
  return TOOL_LAYOUT.find((n) => n.id === id);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<OnboardLang>(loadOnboardLang);
  const [stamps, setStamps] = useState<ToolId[]>(loadStamps);
  const [selected, setSelected] = useState<ToolId>(loadSelectedTool);
  const [shareUrl, setShareUrl] = useState('');
  const t = useMemo(() => onboardCopy(lang), [lang]);
  const tool = t.tools[selected];
  const node = hrefOf(selected);
  const stamped = stamps.includes(selected);

  useEffect(() => {
    setShareUrl(poliradarShareUrl());
  }, []);

  function pickLang(next: OnboardLang) {
    setLang(next);
    saveOnboardLang(next);
  }

  function pickTool(id: ToolId) {
    setSelected(saveSelectedTool(id));
  }

  function stampSelected() {
    setStamps(saveStamp(selected));
  }

  function openSelected() {
    if (!node) return;
    if (node.spa) navigate(node.href);
    else window.location.href = node.href;
  }

  function enterHub() {
    markOnboardDone();
    navigate('/');
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

      <p className="ob-score" aria-live="polite">
        {stamps.length}/8 {t.score}
      </p>

      <ol className="ob-progress" aria-hidden="true">
        {TOOL_LAYOUT.map((item) => (
          <li
            key={item.id}
            className={`ob-dot${stamps.includes(item.id) ? ' is-done' : ''}${
              selected === item.id ? ' is-on' : ''
            }`}
          />
        ))}
      </ol>

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
          {TOOL_LAYOUT.map((item) => {
            const copy = t.tools[item.id];
            const on = selected === item.id;
            const done = stamps.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`ob-nodo${on ? ' is-on' : ''}${item.featured ? ' is-featured' : ''}${
                  done ? ' is-done' : ''
                }`}
                style={{ top: item.top, left: item.left }}
                aria-pressed={on}
                aria-label={`${copy.voc}. ${copy.name}${done ? `. ${t.stamped}` : ''}`}
                onClick={() => pickTool(item.id)}
              >
                <span className="ob-nodo-icon" aria-hidden="true">{item.icon}</span>
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
          {TOOL_LAYOUT.map((item) => {
            const copy = t.tools[item.id];
            const on = selected === item.id;
            const done = stamps.includes(item.id);
            return (
              <li key={`m-${item.id}`}>
                <button
                  type="button"
                  className={`ob-nodo-row${on ? ' is-on' : ''}${item.featured ? ' is-featured' : ''}${
                    done ? ' is-done' : ''
                  }`}
                  aria-pressed={on}
                  onClick={() => pickTool(item.id)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>
                    <strong>{copy.voc}</strong>
                    <em>{copy.name}{done ? ` · ${t.stamped}` : ''}</em>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <MrCard title={tool.name} hint={tool.voc}>
        {node?.featured ? <p className="ob-featured">{t.featured}</p> : null}
        <p className="ob-p">{tool.job}</p>
        {selected === 'poliradar' && shareUrl ? (
          <div className="ob-poli">
            <QrShare url={shareUrl} label={t.shareQr} />
            <Link className="mr-btn mr-btn--primary" to="/poliradar">
              {t.poliCta}
            </Link>
          </div>
        ) : null}
      </MrCard>

      <div className="mr-toolbar ob-nav">
        <MrButton variant="primary" disabled={stamped} onClick={stampSelected}>
          {stamped ? t.stamped : t.stamp}
        </MrButton>
        <MrButton onClick={openSelected}>{t.open} →</MrButton>
        <MrButton variant={stamps.length > 0 ? 'primary' : 'ghost'} onClick={enterHub}>
          {t.enter}
        </MrButton>
        <Link className="mr-btn" to="/" onClick={() => markOnboardDone()}>
          {t.skip}
        </Link>
      </div>

      <p className="mr-privacy">{t.privacy}</p>
      {isOnboardDone() ? <p className="mr-privacy">{t.doneAlready}</p> : null}
    </main>
  );
}
