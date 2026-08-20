import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MrButton } from '../components/metodo-ro/MrButton';
import { MrCard } from '../components/metodo-ro/MrCard';
import { EXTERNAL_LINKS } from '../config/suiteNav';
import {
  ONBOARD_LANGS,
  onboardCopy,
  type OnboardLang,
} from '../lib/onboarding-i18n';
import { registerOnboardPasskey, webauthnAvailable } from '../lib/onboarding-passkey';
import {
  isOnboardDone,
  loadOnboardLang,
  loadPasskeyId,
  markOnboardDone,
  saveOnboardLang,
  savePasskeyId,
} from '../lib/onboarding-storage';
import '../styles/onboarding.css';

const STEPS = ['lang', 'privacy', 'security', 'bio', 'support'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<OnboardLang>(loadOnboardLang);
  const [step, setStep] = useState<Step>('lang');
  const [bioMsg, setBioMsg] = useState<'ok' | 'fail' | 'unsupported' | null>(
    loadPasskeyId() ? 'ok' : webauthnAvailable() ? null : 'unsupported'
  );
  const [busy, setBusy] = useState(false);
  const t = useMemo(() => onboardCopy(lang), [lang]);
  const idx = STEPS.indexOf(step);

  function pickLang(next: OnboardLang) {
    setLang(next);
    saveOnboardLang(next);
  }

  function finish() {
    markOnboardDone();
    navigate('/');
  }

  async function enableBio() {
    setBusy(true);
    try {
      const id = await registerOnboardPasskey();
      savePasskeyId(id);
      setBioMsg('ok');
    } catch {
      setBioMsg(webauthnAvailable() ? 'fail' : 'unsupported');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mr-main ob-main" id="main" tabIndex={-1}>
      <header className="mr-header">
        <div className="mr-eyebrow">UX Tools · Método Ro · WCAG 2.2</div>
        <h1 className="mr-title">Onboarding</h1>
        <p className="mr-sub">{t.pLang}</p>
      </header>

      <nav className="ob-steps" aria-label={t.stepLang}>
        {STEPS.map((id, i) => {
          const labels: Record<Step, string> = {
            lang: t.stepLang,
            privacy: t.stepPrivacy,
            security: t.stepSecurity,
            bio: t.stepBio,
            support: t.stepSupport,
          };
          return (
            <button
              key={id}
              type="button"
              className={`ob-step${step === id ? ' is-active' : ''}`}
              aria-current={step === id ? 'step' : undefined}
              onClick={() => setStep(id)}
            >
              {i + 1}. {labels[id]}
            </button>
          );
        })}
      </nav>

      {step === 'lang' && (
        <MrCard title={t.hLang}>
          <div className="ob-langs" role="radiogroup" aria-label={t.hLang}>
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
        </MrCard>
      )}

      {step === 'privacy' && (
        <MrCard title={t.hPrivacy} hint="Privacy by design">
          <p className="ob-p">{t.pPrivacy}</p>
          <ul className="mr-rules">
            {t.bulletsPrivacy.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </MrCard>
      )}

      {step === 'security' && (
        <MrCard title={t.hSecurity} hint="Security by design">
          <p className="ob-p">{t.pSecurity}</p>
          <ul className="mr-rules">
            {t.bulletsSecurity.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </MrCard>
      )}

      {step === 'bio' && (
        <MrCard title={t.hBio}>
          <p className="ob-p">{t.pBio}</p>
          <div className="mr-toolbar">
            <MrButton
              variant="primary"
              disabled={busy || bioMsg === 'ok' || bioMsg === 'unsupported'}
              onClick={() => void enableBio()}
            >
              {t.bioCta}
            </MrButton>
            <MrButton onClick={() => setStep('support')}>{t.bioSkip}</MrButton>
          </div>
          {bioMsg === 'ok' && <p className="ob-ok">{t.bioOk}</p>}
          {bioMsg === 'fail' && <p className="ob-warn">{t.bioFail}</p>}
          {bioMsg === 'unsupported' && <p className="ob-warn">{t.bioUnsupported}</p>}
        </MrCard>
      )}

      {step === 'support' && (
        <MrCard title={t.hSupport}>
          <p className="ob-p">{t.pSupport}</p>
          <div className="mr-toolbar">
            <a className="mr-btn mr-btn--primary" href={EXTERNAL_LINKS.crowdfund}>
              {t.crowdfund}
            </a>
            <a
              className="mr-btn"
              href={EXTERNAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.code} ↗
            </a>
          </div>
        </MrCard>
      )}

      <div className="mr-toolbar ob-nav">
        {idx > 0 ? (
          <MrButton onClick={() => setStep(STEPS[idx - 1])}>{t.back}</MrButton>
        ) : null}
        {idx < STEPS.length - 1 ? (
          <MrButton variant="primary" onClick={() => setStep(STEPS[idx + 1])}>
            {t.next}
          </MrButton>
        ) : (
          <MrButton variant="primary" onClick={finish}>
            {t.start}
          </MrButton>
        )}
        <Link className="mr-btn" to="/" onClick={() => markOnboardDone()}>
          {t.skip}
        </Link>
      </div>

      {isOnboardDone() ? (
        <p className="mr-privacy">Onboarding ya marcado en este dispositivo.</p>
      ) : null}
    </main>
  );
}
