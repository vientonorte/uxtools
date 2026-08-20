import { useEffect, useId, useState } from 'react';
import QRCode from 'qrcode';

export function QrShare({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const [src, setSrc] = useState('');
  const descriptionId = useId();

  useEffect(() => {
    if (!url) {
      setSrc('');
      return;
    }
    QRCode.toDataURL(url, {
      width: 192,
      margin: 2,
      color: { dark: '#0b0f1a', light: '#FFFFFF' },
    })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [url]);

  if (!src) {
    return (
      <div className="ob-qr-placeholder" role="img" aria-label="Generando código QR" />
    );
  }

  return (
    <figure className="ob-qr">
      <img
        src={src}
        alt=""
        width={192}
        height={192}
        className="ob-qr-img"
        aria-describedby={descriptionId}
      />
      <figcaption id={descriptionId} className="ob-qr-caption">
        {label}
        <br />
        <code className="ob-qr-url">{url}</code>
      </figcaption>
    </figure>
  );
}
