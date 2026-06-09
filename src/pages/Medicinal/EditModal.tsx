import { useEffect, useRef, useState } from 'react';
import type { MedicinalIdData } from '../../types/medicinal';

interface EditModalProps {
  data: MedicinalIdData;
  onSave: (d: MedicinalIdData) => void;
  onClose: () => void;
}

export function EditModal({ data, onSave, onClose }: EditModalProps) {
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
          <button
            type="button"
            className="med-modal__cancel"
            onClick={onClose}
            aria-label="Cancelar y cerrar formulario"
          >
            Cancelar
          </button>
          <h2 id="med-modal-title" className="med-modal__title">
            {data.nombre ? 'Editar datos' : 'Cargar mis datos'}
          </h2>
          <button
            type="button"
            className="med-modal__save-header"
            onClick={() => {
              const canSave = !!form.nombre && !!form.fechaReceta && !!form.dosis;
              if (canSave) onSave({ ...form, updatedAt: new Date().toISOString() });
            }}
            disabled={!form.nombre || !form.fechaReceta || !form.dosis}
            aria-label="Guardar datos del carnet"
          >
            Guardar
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

            <div className="med-form__row">
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
                  placeholder="ej: 2 gramos"
                  required
                />
              </div>

              <div className="med-form__group">
                <label htmlFor="med-cantidad-mensual" className="med-form__label">
                  Cantidad mensual{' '}
                  <span className="med-form__hint">(dispensación)</span>
                </label>
                <input
                  id="med-cantidad-mensual"
                  className="med-form__input"
                  type="text"
                  value={form.cantidadMensual}
                  onChange={(e) => update('cantidadMensual', e.target.value)}
                  placeholder="ej: 50 g/mes"
                />
              </div>
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
