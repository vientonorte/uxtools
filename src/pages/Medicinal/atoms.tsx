import { useEffect, useId, useState } from 'react';
import QRCode from 'qrcode';

// ── QR display ───────────────────────────────────────────────

export function QrDisplay({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  const descriptionId = useId();

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
    <>
      <img
        src={src}
        alt=""
        width={160}
        height={160}
        className="med-qr-img"
        aria-describedby={descriptionId}
      />
      <p id={descriptionId} className="med-sr-only">
        Datos del carnet para validación: {text}
      </p>
    </>
  );
}

// ── Privacy toggle ───────────────────────────────────────────

export function PrivacyToggle({
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
