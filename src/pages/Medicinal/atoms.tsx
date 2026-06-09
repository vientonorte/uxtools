import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// ── QR display ───────────────────────────────────────────────

export function QrDisplay({ text }: { text: string }) {
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
