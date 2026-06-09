import { useState } from 'react';
import type { MedicinalIdData } from '../../types/medicinal';
import { isVigente, calcProximoControl, buildQrText, formatDateES } from './utils';
import { QrDisplay } from './atoms';
import { LegalArticle } from './LegalArticle';

export function IdCard({ data }: { data: MedicinalIdData }) {
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
                  <dt>Dosis diaria Cannabis spp</dt>
                  <dd>{data.dosis || '—'}</dd>
                </div>

                {data.cantidadMensual && (
                  <div className="med-card__field med-card__field--highlight">
                    <dt>Cantidad autorizada (dispensación)</dt>
                    <dd>{data.cantidadMensual} <span className="med-card__field-note">porte justificado · Art. 4° + Art. 50° inc. final</span></dd>
                  </div>
                )}

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
            <LegalArticle
              variant="protection"
              title="Art. 4° — Excepción Tratamiento Médico"
              keyText="«…a menos que justifique que están destinadas a la atención de un tratamiento médico o a su uso o consumo personal exclusivo y próximo en el tiempo.»"
              footnote="La cantidad mensual autorizada acredita directamente esta excepción contra imputación por microtráfico."
            >
              {''}
            </LegalArticle>

            <LegalArticle
              variant="protection"
              title="Art. 50° Inc. Final — Justificación Médica"
              keyText="«Se entenderá justificado el uso, consumo, porte o tenencia de alguna de dichas sustancias para la atención de un tratamiento médico.»"
              footnote="Desactiva todas las sanciones administrativas del Art. 50° — multas, programas, suspensión de licencia."
            >
              {''}
            </LegalArticle>

            <LegalArticle
              variant="rights"
              title="Ley 20.584 — Confidencialidad Médica"
              footnote="Art. 8° justifica el cultivo con receta médica. Ver reverso completo en la sección «Escenarios» más abajo."
            >
              Solo médico tratante · COMPIN · tribunal con causa pueden solicitar la receta. Carabineros y terceros no tienen ese derecho.
            </LegalArticle>

            <p className="med-card__back-disclaimer">
              Porta siempre la receta original para presentarla a quienes
              corresponde por ley (médico, COMPIN, tribunales).
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
