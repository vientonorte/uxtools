import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { MedicinalIdData } from '../../types/medicinal';
import { MEDICINAL_DEFAULT, MEDICINAL_STORAGE_KEY } from '../../types/medicinal';
import { IdCard } from './IdCard';
import { EditModal } from './EditModal';
import { FaqAutodefensa } from './FaqAutodefensa';
import { PrivacyToggle } from './atoms';
import { buildShareText } from './utils';

// ── PWA install prompt ───────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Medicinal() {
  const [data, setData] = useLocalStorage<MedicinalIdData>(
    MEDICINAL_STORAGE_KEY,
    MEDICINAL_DEFAULT
  );
  const [editOpen, setEditOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [savingImg, setSavingImg] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const hasData = !!data.nombre;

  // Capture PWA install event (Android/Chrome)
  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Detect iOS Safari
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !/chrome/i.test(ua);
    setIsIos(ios);
  }, []);

  function handleSave(newData: MedicinalIdData) {
    setData(newData);
    setEditOpen(false);
    setSavedMsg('✓ Datos guardados');
    setTimeout(() => setSavedMsg(''), 3000);
  }

  async function handleShare() {
    const text = buildShareText(data);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ID Paciente Medicinal', text });
      } else {
        await navigator.clipboard.writeText(text);
        setSavedMsg('✓ Copiado al portapapeles');
        setTimeout(() => setSavedMsg(''), 3000);
      }
    } catch {
      // user dismissed share sheet or clipboard unavailable
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleInstall() {
    if (isIos) {
      setShowIosHint((v) => !v);
      return;
    }
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setSavedMsg('✓ App instalada en tu pantalla de inicio');
      setTimeout(() => setSavedMsg(''), 4000);
    }
  }

  async function handleSaveImage() {
    const el = document.querySelector<HTMLElement>('.med-card');
    if (!el) return;
    setSavingImg(true);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `carnet-medicinal-${data.nombre.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setSavedMsg('✓ Imagen guardada');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setSavedMsg('Error al generar imagen');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setSavingImg(false);
    }
  }

  const showInstallBtn = isIos || !!installPrompt;

  return (
    <>
      <main className="med-main" id="main" tabIndex={-1} ref={cardRef}>
        <header className="med-header">
          <div className="med-eyebrow">Herramienta Personal · vientonorte</div>
          <h1 className="med-title">ID Medicinal</h1>
          <p className="med-sub">
            Carnet digital de paciente medicinal de cannabis. Tus datos se guardan
            solo en tu dispositivo — nada sale de tu navegador.
          </p>
        </header>

        <div className="med-body">
          {/* ── PWA install banner ── */}
          {showInstallBtn && (
            <div className="med-install-banner" role="complementary" aria-label="Instalar app">
              <div className="med-install-banner__text">
                <strong>Agregar a pantalla de inicio</strong>
                <span>Accede a tu carnet como app nativa, sin abrir el navegador</span>
              </div>
              <button
                className="med-btn med-btn--install"
                onClick={handleInstall}
                aria-label={isIos ? 'Ver instrucciones para instalar en iOS' : 'Instalar app en pantalla de inicio'}
              >
                {isIos ? 'Cómo instalar' : 'Instalar'}
              </button>
            </div>
          )}

          {/* ── iOS install instructions ── */}
          {showIosHint && (
            <div className="med-ios-hint" role="note" aria-label="Instrucciones para iOS">
              <p>
                En Safari: toca <strong>Compartir</strong> <span aria-hidden="true">⎙</span> →
                «<strong>Agregar a pantalla de inicio</strong>»
              </p>
              <button
                className="med-ios-hint__close"
                onClick={() => setShowIosHint(false)}
                aria-label="Cerrar instrucciones"
              >
                ✕
              </button>
            </div>
          )}

          <div className="med-privacy" aria-label="Controles de privacidad">
            <span className="med-privacy__label">Privacidad:</span>
            <PrivacyToggle
              id="toggle-rut"
              label="Mostrar RUT"
              checked={data.mostrarRut}
              onChange={(v) => setData({ ...data, mostrarRut: v })}
            />
            <PrivacyToggle
              id="toggle-diag"
              label="Mostrar diagnóstico"
              checked={data.mostrarDiagnostico}
              onChange={(v) => setData({ ...data, mostrarDiagnostico: v })}
            />
          </div>

          <IdCard data={data} />

          <div className="med-actions" role="group" aria-label="Acciones del carnet">
            <button
              className="med-btn med-btn--primary"
              onClick={() => setEditOpen(true)}
            >
              {hasData ? 'Editar datos' : 'Cargar mis datos'}
            </button>
            {hasData && (
              <>
                <button className="med-btn med-btn--ghost" onClick={handlePrint}>
                  Imprimir
                </button>
                <button className="med-btn med-btn--ghost" onClick={handleShare}>
                  Compartir
                </button>
                <button
                  className="med-btn med-btn--ghost"
                  onClick={handleSaveImage}
                  disabled={savingImg}
                  aria-label="Guardar carnet como imagen PNG"
                >
                  {savingImg ? 'Generando…' : 'Guardar imagen'}
                </button>
              </>
            )}
          </div>

          {savedMsg && (
            <div
              className="med-saved-notice"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {savedMsg}
            </div>
          )}

          <FaqAutodefensa />

          <section className="med-license" aria-label="Licencia">
            <p>
              Código abierto para uso no comercial ·{' '}
              <a
                href="https://creativecommons.org/licenses/by-nc/4.0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC BY-NC 4.0
              </a>{' '}
              · © Rodrigo Gaete Gaona
            </p>
            <p className="med-license__disclaimer">
              Ningún dato se envía a servidores externos. Todo se almacena localmente en tu navegador.
            </p>
          </section>
        </div>
      </main>

      {editOpen && (
        <EditModal
          data={data}
          onSave={handleSave}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
