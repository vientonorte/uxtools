import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MrButton } from './metodo-ro/MrButton';
import { MrCard } from './metodo-ro/MrCard';
import { QrShare } from './QrShare';
import {
  ONBOARD_LANGS,
  TOOL_LAYOUT,
  onboardCopy,
  type OnboardLang,
  type ToolId,
} from '../lib/onboarding-i18n';
import { poliradarShareUrl } from '../lib/poliradar';
import {
  isToolStamped,
  loadOnboardLang,
  loadStamps,
  saveOnboardLang,
  saveStamp,
} from '../lib/onboarding-storage';
import '../styles/onboarding.css';

export function ToolGate({
  id,
  children,
}: {
  id: ToolId;
  children: ReactNode;
}) {
  const [seen, setSeen] = useState(() => isToolStamped(id));
  if (!seen) {
    return <ToolFirstView toolId={id} onEnter={() => setSeen(true)} />;
  }
  return children;
}

function ToolFirstView({
  toolId,
  onEnter,
}: {
  toolId: ToolId;
  onEnter: () => void;
}) {
  const [lang, setLang] = useState<OnboardLang>(loadOnboardLang);
  const [shareUrl, setShareUrl] = useState('');
  const t = useMemo(() => onboardCopy(lang), [lang]);
  const copy = t.tools[toolId];
  const node = TOOL_LAYOUT.find((n) => n.id === toolId);
  const stamps = loadStamps();

  useEffect(() => {
    if (toolId === 'poliradar') setShareUrl(poliradarShareUrl());
  }, [toolId]);

  function enter() {
    saveStamp(toolId);
    onEnter();
  }

  return (
    <main className="mr-main ob-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">{t.firstEyebrow}</div>
        <h1 className="mr-title">
          <span aria-hidden="true">{node?.icon} </span>
          {copy.name}
        </h1>
        <p className="mr-sub">{copy.voc}</p>
      </header>

      <div className="ob-langs" role="radiogroup" aria-label={t.firstEyebrow}>
        {ONBOARD_LANGS.map((l) => (
          <label key={l.id} className={`ob-lang${lang === l.id ? ' is-on' : ''}`}>
            <input
              type="radio"
              name="ob-lang-tool"
              checked={lang === l.id}
              onChange={() => {
                setLang(l.id);
                saveOnboardLang(l.id);
              }}
            />
            <span>{l.native}</span>
          </label>
        ))}
      </div>

      <p className="ob-score" aria-live="polite">
        {stamps.length}/8 {t.score}
      </p>

      <MrCard title={copy.name} hint={copy.voc}>
        {node?.featured ? <p className="ob-featured">{t.featured}</p> : null}
        <p className="ob-p">{copy.job}</p>
        {toolId === 'poliradar' && shareUrl ? (
          <div className="ob-poli">
            <QrShare url={shareUrl} label={t.shareQr} />
            <p className="ob-p">{t.poliCta}</p>
          </div>
        ) : null}
      </MrCard>

      <div className="mr-toolbar ob-nav">
        <MrButton variant="primary" onClick={enter}>
          {t.enterTool.replace('{name}', copy.name)}
        </MrButton>
        <Link className="mr-btn" to="/onboarding">
          {t.mapCta}
        </Link>
      </div>

      <p className="mr-privacy">{t.privacy}</p>
    </main>
  );
}
