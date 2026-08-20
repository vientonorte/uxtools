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
  DECIDE_OPTIONS,
  SKETCH_OPTIONS,
  SPRINT_COPY,
  SPRINT_DAYS,
  type DecideId,
  type SketchId,
  type SprintDay,
} from '../lib/onboarding-sprint';
import {
  isOnboardDone,
  loadOnboardLang,
  loadPicks,
  loadStamps,
  markOnboardDone,
  saveOnboardLang,
  savePicks,
  saveStamp,
} from '../lib/onboarding-storage';
import '../styles/onboarding.css';

function hrefOf(id: ToolId) {
  return TOOL_LAYOUT.find((n) => n.id === id);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<OnboardLang>(loadOnboardLang);
  const [day, setDay] = useState<SprintDay>('map');
  const [stamps, setStamps] = useState<SprintDay[]>(loadStamps);
  const [picks, setPicks] = useState(() => {
    const loaded = loadPicks();
    if (loaded.map) return loaded;
    return savePicks({ map: 'poliradar' });
  });
  const [checks, setChecks] = useState([false, false, false]);
  const t = useMemo(() => onboardCopy(lang), [lang]);
  const s = SPRINT_COPY[lang];
  const dayCopy = s.days[day];
  const idx = SPRINT_DAYS.indexOf(day);
  const mapId = (picks.map as ToolId | undefined) ?? 'poliradar';
  const mapTool = t.tools[mapId];

  function pickLang(next: OnboardLang) {
    setLang(next);
    saveOnboardLang(next);
  }

  function pickMap(id: ToolId) {
    setPicks(savePicks({ map: id }));
  }

  function pickSketch(id: SketchId) {
    setPicks(savePicks({ sketch: id }));
  }

  function pickDecide(id: DecideId) {
    setPicks(savePicks({ decide: id }));
  }

  function stampDay() {
    if (day === 'map' && !picks.map) return;
    if (day === 'sketch' && !picks.sketch) return;
    if (day === 'decide' && !picks.decide) return;
    if (day === 'test' && checks.some((c) => !c)) return;
    const next = saveStamp(day);
    setStamps(next);
    if (day === 'test') {
      markOnboardDone();
      navigate('/');
      return;
    }
    const i = SPRINT_DAYS.indexOf(day);
    if (i < SPRINT_DAYS.length - 1) setDay(SPRINT_DAYS[i + 1]);
  }

  function openTool(id: ToolId) {
    const node = hrefOf(id);
    if (!node) return;
    if (node.spa) navigate(node.href);
    else window.location.href = node.href;
  }

  const canStamp =
    day === 'map'
      ? Boolean(picks.map)
      : day === 'sketch'
        ? Boolean(picks.sketch)
        : day === 'decide'
          ? Boolean(picks.decide)
          : day === 'test'
            ? checks.every(Boolean)
            : true;

  const prototypeTool: ToolId =
    (picks.decide as ToolId | undefined) ??
    (picks.sketch as ToolId | undefined) ??
    'poliradar';

  return (
    <main className="mr-main ob-main ob-main--map" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">{s.eyebrow}</div>
        <h1 className="mr-title">{s.title}</h1>
        <p className="mr-sub">{s.sub}</p>
      </header>

      <div className="ob-langs" role="radiogroup" aria-label={s.eyebrow}>
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
        {stamps.length}/5 {s.score}
      </p>

      <nav className="ob-days" aria-label="Design Sprint VN">
        {SPRINT_DAYS.map((id) => {
          const d = s.days[id];
          const done = stamps.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`ob-day${day === id ? ' is-on' : ''}${done ? ' is-done' : ''}`}
              aria-current={day === id ? 'step' : undefined}
              onClick={() => setDay(id)}
            >
              <span className="ob-day-n">{d.n}</span>
              <span>{d.name}</span>
            </button>
          );
        })}
      </nav>

      <MrCard title={`${dayCopy.n} · ${dayCopy.name}`} hint={dayCopy.question}>
        <p className="ob-p">{dayCopy.do}</p>
        <p className="ob-dont">{dayCopy.dont}</p>
      </MrCard>

      {day === 'map' && (
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
              const on = mapId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`ob-nodo${on ? ' is-on' : ''}${node.featured ? ' is-featured' : ''}`}
                  style={{ top: node.top, left: node.left }}
                  aria-pressed={on}
                  aria-label={`${copy.voc}. ${copy.name}`}
                  onClick={() => pickMap(node.id)}
                >
                  <span className="ob-nodo-icon" aria-hidden="true">{node.icon}</span>
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
              const on = mapId === node.id;
              return (
                <li key={`m-${node.id}`}>
                  <button
                    type="button"
                    className={`ob-nodo-row${on ? ' is-on' : ''}${node.featured ? ' is-featured' : ''}`}
                    aria-pressed={on}
                    onClick={() => pickMap(node.id)}
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
          <MrCard title={mapTool.name} hint={mapTool.voc}>
            <p className="ob-p">{mapTool.job}</p>
          </MrCard>
        </section>
      )}

      {day === 'sketch' && (
        <div className="ob-picks" role="radiogroup" aria-label={dayCopy.question}>
          {SKETCH_OPTIONS.map((opt) => {
            const copy = s.sketches[opt.id];
            const on = picks.sketch === opt.id;
            return (
              <label key={opt.id} className={`ob-pick${on ? ' is-on' : ''}`}>
                <input
                  type="radio"
                  name="ob-sketch"
                  checked={on}
                  onChange={() => pickSketch(opt.id)}
                />
                <strong>{copy.name}</strong>
                <span>{copy.job}</span>
              </label>
            );
          })}
        </div>
      )}

      {day === 'decide' && (
        <>
          <ol className="ob-story">
            {s.story.map((frame) => (
              <li key={frame}>{frame}</li>
            ))}
          </ol>
          <div className="ob-picks" role="radiogroup" aria-label={dayCopy.question}>
            {DECIDE_OPTIONS.map((opt) => {
              const copy = s.decide[opt.id];
              const on = picks.decide === opt.id;
              return (
                <label key={opt.id} className={`ob-pick${on ? ' is-on' : ''}${opt.id === 'poliradar' ? ' is-featured' : ''}`}>
                  <input
                    type="radio"
                    name="ob-decide"
                    checked={on}
                    onChange={() => pickDecide(opt.id)}
                  />
                  <strong>{copy.name}</strong>
                  <span>{copy.job}</span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {day === 'prototype' && (
        <MrCard title={t.tools[prototypeTool].name} hint={t.featured}>
          <p className="ob-p">{t.tools[prototypeTool].job}</p>
          <div className="mr-toolbar">
            <MrButton variant="primary" onClick={() => openTool(prototypeTool)}>
              {t.open} →
            </MrButton>
            <Link className="mr-btn" to="/poliradar">
              {t.poliCta}
            </Link>
          </div>
        </MrCard>
      )}

      {day === 'test' && (
        <fieldset className="ob-checks">
          <legend>{s.testHint}</legend>
          {s.checks.map((label, i) => (
            <label key={label} className="ob-check">
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() =>
                  setChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="mr-toolbar ob-nav">
        {idx > 0 ? (
          <MrButton onClick={() => setDay(SPRINT_DAYS[idx - 1])}>{s.back}</MrButton>
        ) : null}
        <MrButton variant="primary" disabled={!canStamp} onClick={stampDay}>
          {stamps.includes(day) ? s.stamped : dayCopy.cta}
        </MrButton>
        {idx < SPRINT_DAYS.length - 1 && stamps.includes(day) ? (
          <MrButton onClick={() => setDay(SPRINT_DAYS[idx + 1])}>{s.next}</MrButton>
        ) : null}
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
