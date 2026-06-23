import { useState } from 'react';
import { MEDICINAL_PUBLIC_URL } from '../../config/medicinal';

export function PatientAccess() {
  const [copyLabel, setCopyLabel] = useState('Copiar enlace');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(MEDICINAL_PUBLIC_URL);
      setCopyLabel('¡Copiado!');
      setTimeout(() => setCopyLabel('Copiar enlace'), 2000);
    } catch {
      setCopyLabel('Error al copiar');
      setTimeout(() => setCopyLabel('Copiar enlace'), 2000);
    }
  }

  return (
    <details className="med-access">
      <summary className="med-access__summary">
        Acceso y roadmap del proyecto
      </summary>

      <div className="med-access__body">
        <p className="med-access__desc">
          Enlace de distribución para nuevos pacientes. El QR del carnet valida tus
          datos ante fiscalización; este enlace sirve para compartir la app.
        </p>

        <div className="med-access__link-row">
          <a
            className="med-access__link"
            href={MEDICINAL_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {MEDICINAL_PUBLIC_URL}
          </a>
          <button
            type="button"
            className="med-btn med-btn--ghost med-access__copy"
            onClick={handleCopy}
            aria-label="Copiar enlace de acceso paciente"
          >
            {copyLabel}
          </button>
        </div>

        <ul className="med-access__roadmap" aria-label="Evolución del carnet">
          <li>
            <strong>Hoy:</strong> autogestión local — tú cargas los datos de tu receta
            en tu dispositivo.
          </li>
          <li>
            <strong>Alternativa actual del mercado:</strong> QR de terceros (ej. Cultiva
            tus derechos) sin control de diseño ni privacidad.
          </li>
          <li>
            <strong>Próximo:</strong> ingreso por médico tras la receta, vía convenios
            con Fundación Daya y/o dispensarios asociados.
          </li>
        </ul>
      </div>
    </details>
  );
}