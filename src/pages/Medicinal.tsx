import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { MedicinalIdData } from '../types/medicinal';
import { MEDICINAL_DEFAULT, MEDICINAL_STORAGE_KEY } from '../types/medicinal';

// ── Date helpers ─────────────────────────────────────────────

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatDateES(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function calcProximoControl(fechaReceta: string, vigenciaMeses: number): string {
  if (!fechaReceta) return '—';
  const d = new Date(fechaReceta + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  d.setMonth(d.getMonth() + vigenciaMeses);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function isVigente(fechaReceta: string, vigenciaMeses: number): boolean {
  if (!fechaReceta) return false;
  const venc = new Date(fechaReceta + 'T00:00:00');
  if (isNaN(venc.getTime())) return false;
  venc.setMonth(venc.getMonth() + vigenciaMeses);
  return new Date() <= venc;
}

function buildQrText(data: MedicinalIdData): string {
  return [
    'CARNET MEDICINAL CANNABIS · LEY 20.000 CHILE',
    `Nombre: ${data.nombre}`,
    data.mostrarRut && data.rut ? `RUT: ${data.rut}` : null,
    `Receta: ${formatDateES(data.fechaReceta)}`,
    `Vigencia: ${data.vigenciaMeses} meses`,
    `Control: ${calcProximoControl(data.fechaReceta, data.vigenciaMeses)}`,
    `Dosis: ${data.dosis} Cannabis spp (porte justificado)`,
    data.medicoTratante ? `Médico: ${data.medicoTratante}` : null,
    data.organizacion ? `Org: ${data.organizacion}` : null,
    '',
    'Art.15 Ley 20.000 — Porte justificado para tratamiento médico',
  ].filter(Boolean).join('\n');
}

function buildShareText(data: MedicinalIdData): string {
  return [
    '🌿 CARNET MEDICINAL CANNABIS · LEY 20.000 CHILE',
    `Nombre: ${data.nombre}`,
    data.mostrarRut && data.rut ? `RUT: ${data.rut}` : null,
    `Receta: ${formatDateES(data.fechaReceta)}`,
    `Vigencia: ${data.vigenciaMeses} meses`,
    `Control: ${calcProximoControl(data.fechaReceta, data.vigenciaMeses)}`,
    `Dosis: ${data.dosis} Cannabis spp (porte justificado)`,
    data.mostrarDiagnostico && data.diagnostico ? `Diagnóstico: ${data.diagnostico}` : null,
    data.medicoTratante ? `Médico: ${data.medicoTratante}` : null,
    '',
    'Art.15 Ley 20.000 — Porte justificado para tratamiento médico',
  ].filter(Boolean).join('\n');
}

// ── QR display ───────────────────────────────────────────────

function QrDisplay({ text }: { text: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!text) { setSrc(''); return; }
    QRCode.toDataURL(text, {
      width: 160,
      margin: 2,
      color: { dark: '#001A72', light: '#FFFFFF' },
    }).then(setSrc).catch(() => setSrc(''));
  }, [text]);

  if (!src) {
    return (
      <div
        className="med-qr-placeholder"
        role="img"
        aria-label="Sin datos suficientes para generar código QR"
      />
    );
  }

  return (
    <img
      src={src}
      alt="Código QR con datos del carnet medicinal"
      width={160}
      height={160}
      className="med-qr-img"
    />
  );
}

// ── Privacy toggle ───────────────────────────────────────────

function PrivacyToggle({
  id, label, checked, onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="med-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="med-toggle__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="med-toggle__track" aria-hidden="true">
        <span className="med-toggle__thumb" />
      </span>
      <span className="med-toggle__label">{label}</span>
    </label>
  );
}

// ── ID Card ──────────────────────────────────────────────────

function IdCard({ data }: { data: MedicinalIdData }) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const vigente = isVigente(data.fechaReceta, data.vigenciaMeses);
  const control = calcProximoControl(data.fechaReceta, data.vigenciaMeses);
  const qrText = buildQrText(data);
  const hasData = !!data.nombre;

  if (!hasData) {
    return (
      <div className="med-empty">
        <span className="med-empty__icon" aria-hidden="true">🌿</span>
        <h2 className="med-empty__title">Sin datos cargados</h2>
        <p className="med-empty__desc">
          Completa el formulario para ver tu carnet digital.
        </p>
      </div>
    );
  }

  return (
    <article
      className="med-card"
      aria-label={
        side === 'front'
          ? 'Identificación de paciente medicinal de cannabis — anverso'
          : 'Respaldo legal del carnet — reverso'
      }
    >
      {/* ── FRONT ── */}
      {side === 'front' && (
        <>
          <div className="med-card__header">
            <div className="med-card__header-text">
              <div className="med-card__law-badge">
                <span aria-hidden="true">🌿</span>&nbsp;Ley 20.000 · Chile
              </div>
              <h2 className="med-card__title">
                Identificación de Paciente<br />Medicinal de Cannabis
              </h2>
            </div>
            <div
              className={`med-card__status med-card__status--${vigente ? 'vigente' : 'vencido'}`}
              role="status"
              aria-label={vigente ? 'Carnet vigente' : 'Carnet vencido'}
            >
              {vigente ? 'VIGENTE' : 'VENCIDO'}
            </div>
          </div>

          <div className="med-card__body">
            <div className="med-card__fields">
              <dl>
                <div className="med-card__field">
                  <dt>Nombre del paciente</dt>
                  <dd>{data.nombre}</dd>
                </div>

                {data.rut && (
                  <div className="med-card__field">
                    <dt>RUT</dt>
                    <dd aria-label={data.mostrarRut ? `RUT: ${data.rut}` : 'RUT oculto'}>
                      {data.mostrarRut ? data.rut : '•••••••-•'}
                    </dd>
                  </div>
                )}

                <div className="med-card__field">
                  <dt>Fecha de receta</dt>
                  <dd>{formatDateES(data.fechaReceta)}</dd>
                </div>

                <div className="med-card__field">
                  <dt>Vigencia</dt>
                  <dd>{data.vigenciaMeses} meses</dd>
                </div>

                <div className="med-card__field">
                  <dt>Próximo control</dt>
                  <dd>{control}</dd>
                </div>

                <div className="med-card__field">
                  <dt>Dosis diaria Cannabis spp (porte justificado)</dt>
                  <dd>{data.dosis || '—'}</dd>
                </div>

                <div className="med-card__field">
                  <dt>Diagnóstico</dt>
                  <dd
                    aria-label={
                      data.mostrarDiagnostico
                        ? `Diagnóstico: ${data.diagnostico || 'no especificado'}`
                        : 'Diagnóstico reservado'
                    }
                  >
                    {data.mostrarDiagnostico ? (data.diagnostico || '—') : 'RESERVADO'}
                  </dd>
                </div>

                {data.medicoTratante && (
                  <div className="med-card__field">
                    <dt>Médico tratante</dt>
                    <dd>{data.medicoTratante}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="med-card__qr">
              <QrDisplay text={qrText} />
              <span className="med-card__qr-label">Escanear para validar</span>
            </div>
          </div>

          <div className="med-card__footer">
            <span className="med-card__footer-text">
              Cannabis spp · Porte justificado
              {data.dosis ? ` · ${data.dosis}/día` : ''}
            </span>
            <button
              className="med-card__flip-btn"
              onClick={() => setSide('back')}
              aria-label="Ver respaldo legal del carnet"
            >
              Marco Legal →
            </button>
          </div>
        </>
      )}

      {/* ── BACK ── */}
      {side === 'back' && (
        <>
          <div className="med-card__header med-card__header--legal">
            <div className="med-card__header-text">
              <div className="med-card__law-badge">
                <span aria-hidden="true">⚖️</span>&nbsp;Respaldo Legal
              </div>
              <h2 className="med-card__title">
                Ley 20.000 · República de Chile
              </h2>
            </div>
          </div>

          <div className="med-card__back-body">
            <div className="med-card__back-article">
              <h3 className="med-card__back-art-title">
                Artículo 8° — Cultivo Justificado
              </h3>
              <p className="med-card__back-art-text">
                «Se entenderá justificado el cultivo de especies vegetales del género cannabis
                para la atención de un tratamiento médico, con la presentación de la receta
                extendida para ese efecto por un médico cirujano tratante, la que deberá indicar
                el diagnóstico de la enfermedad, su tratamiento y duración, además de la forma
                de administración del cannabis, la que no podrá ser mediante combustión.»
              </p>
            </div>

            <div className="med-card__back-article">
              <h3 className="med-card__back-art-title">
                Artículo 15° — Porte Justificado
              </h3>
              <p className="med-card__back-art-text">
                «Dichas penas no se aplicarán a los que justifiquen el uso, consumo, porte
                o tenencia de alguna de dichas sustancias en la atención de un tratamiento médico.»
              </p>
            </div>

            <p className="med-card__back-disclaimer">
              Este carnet es un complemento informativo. Porta siempre la receta médica original.
              No reemplaza documentos legales oficiales.
            </p>
          </div>

          <div className="med-card__footer">
            <button
              className="med-card__flip-btn"
              onClick={() => setSide('front')}
              aria-label="Volver al anverso del carnet"
            >
              ← Ver datos
            </button>
            <span className="med-card__org" aria-hidden="true">
              {data.nombre}
            </span>
          </div>
        </>
      )}
    </article>
  );
}

// ── Edit modal ───────────────────────────────────────────────

interface EditModalProps {
  data: MedicinalIdData;
  onSave: (d: MedicinalIdData) => void;
  onClose: () => void;
}

function EditModal({ data, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState<MedicinalIdData>({ ...data });
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input and trap focus
  useEffect(() => {
    firstInputRef.current?.focus();

    const el = dialogRef.current;
    if (!el) return;

    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusables = Array.from(el!.querySelectorAll<HTMLElement>(focusableSelectors));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function update<K extends keyof MedicinalIdData>(key: K, val: MedicinalIdData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...form, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="med-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="med-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="med-modal-title"
      >
        <div className="med-modal__header">
          <h2 id="med-modal-title" className="med-modal__title">
            {data.nombre ? 'Editar datos del carnet' : 'Cargar mis datos'}
          </h2>
          <button
            className="med-modal__close"
            onClick={onClose}
            aria-label="Cerrar formulario"
          >
            ✕
          </button>
        </div>

        <form className="med-form" onSubmit={handleSubmit} noValidate>
          <div className="med-modal__body">
            <div className="med-form__group">
              <label htmlFor="med-nombre" className="med-form__label">
                Nombre del paciente *
              </label>
              <input
                ref={firstInputRef}
                id="med-nombre"
                className="med-form__input"
                type="text"
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="med-form__group">
              <label htmlFor="med-rut" className="med-form__label">RUT</label>
              <input
                id="med-rut"
                className="med-form__input"
                type="text"
                value={form.rut}
                onChange={(e) => update('rut', e.target.value)}
                placeholder="12.345.678-9"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className="med-form__row">
              <div className="med-form__group">
                <label htmlFor="med-fecha-receta" className="med-form__label">
                  Fecha de receta *
                </label>
                <input
                  id="med-fecha-receta"
                  className="med-form__input"
                  type="date"
                  value={form.fechaReceta}
                  onChange={(e) => update('fechaReceta', e.target.value)}
                  required
                />
              </div>

              <div className="med-form__group">
                <label htmlFor="med-vigencia" className="med-form__label">
                  Vigencia *
                </label>
                <select
                  id="med-vigencia"
                  className="med-form__select"
                  value={form.vigenciaMeses}
                  onChange={(e) =>
                    update('vigenciaMeses', Number(e.target.value) as MedicinalIdData['vigenciaMeses'])
                  }
                  required
                >
                  <option value={1}>1 mes</option>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>
            </div>

            <div className="med-form__group">
              <label htmlFor="med-dosis" className="med-form__label">
                Dosis diaria *
              </label>
              <input
                id="med-dosis"
                className="med-form__input"
                type="text"
                value={form.dosis}
                onChange={(e) => update('dosis', e.target.value)}
                placeholder="ej: 1,5 gramos"
                required
              />
            </div>

            <div className="med-form__group">
              <label htmlFor="med-diagnostico" className="med-form__label">
                Diagnóstico{' '}
                <span className="med-form__hint">
                  (guardado solo en tu dispositivo)
                </span>
              </label>
              <textarea
                id="med-diagnostico"
                className="med-form__textarea"
                value={form.diagnostico}
                onChange={(e) => update('diagnostico', e.target.value)}
                rows={2}
                placeholder="Opcional — aparecerá como RESERVADO por defecto"
              />
            </div>

            <div className="med-form__group">
              <label htmlFor="med-medico" className="med-form__label">
                Médico tratante
              </label>
              <input
                id="med-medico"
                className="med-form__input"
                type="text"
                value={form.medicoTratante}
                onChange={(e) => update('medicoTratante', e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="med-form__group">
              <label htmlFor="med-org" className="med-form__label">
                Organización / comunidad
              </label>
              <input
                id="med-org"
                className="med-form__input"
                type="text"
                value={form.organizacion}
                onChange={(e) => update('organizacion', e.target.value)}
                placeholder="ej: CDcomunidad, Cultiva Derecho"
              />
            </div>
          </div>

          <div className="med-modal__footer">
            <button
              type="button"
              className="med-btn med-btn--ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="med-btn med-btn--primary"
              disabled={!form.nombre || !form.fechaReceta || !form.dosis}
            >
              Guardar datos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function Medicinal() {
  const [data, setData] = useLocalStorage<MedicinalIdData>(
    MEDICINAL_STORAGE_KEY,
    MEDICINAL_DEFAULT
  );
  const [editOpen, setEditOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const hasData = !!data.nombre;

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

  return (
    <>
      <main className="med-main" id="main" tabIndex={-1}>
        <header className="med-header">
          <div className="med-eyebrow">Herramienta Personal · vientonorte</div>
          <h1 className="med-title">ID Medicinal</h1>
          <p className="med-sub">
            Carnet digital de paciente medicinal de cannabis. Tus datos se guardan
            solo en tu dispositivo — nada sale de tu navegador.
          </p>
        </header>

        <div className="med-body">
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
