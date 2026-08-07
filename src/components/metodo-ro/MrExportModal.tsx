import { useRef, useState, type RefObject } from 'react';
import { encryptPayload } from '../../lib/metodo-ro-crypto';
import { downloadJson } from '../../lib/metodo-ro-storage';
import { MrButton } from './MrButton';
import { MrField } from './MrField';
import { MrModal } from './MrModal';

interface MrExportModalProps {
  open: boolean;
  onClose: () => void;
  /** Payload to export (session object) */
  payload: unknown;
  tool: 'selfradar' | 'kit-tlp';
  filenameBase: string;
  /** If true, default to encrypted and warn about sensitivity */
  preferEncrypted?: boolean;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}

type Mode = 'plain' | 'encrypted';

export function MrExportModal({
  open,
  onClose,
  payload,
  tool,
  filenameBase,
  preferEncrypted = false,
  onDone,
  onError,
}: MrExportModalProps) {
  const [mode, setMode] = useState<Mode>(preferEncrypted ? 'encrypted' : 'plain');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  function resetAndClose() {
    setPass('');
    setPass2('');
    setMode(preferEncrypted ? 'encrypted' : 'plain');
    setBusy(false);
    onClose();
  }

  async function handleExport() {
    if (busy) return;
    if (mode === 'plain') {
      downloadJson(`${filenameBase}.json`, payload);
      onDone('JSON exportado (sin cifrar · solo este dispositivo)');
      resetAndClose();
      return;
    }
    if (pass.length < 8) {
      onError('La frase debe tener al menos 8 caracteres');
      return;
    }
    if (pass !== pass2) {
      onError('Las frases no coinciden');
      return;
    }
    setBusy(true);
    try {
      const envelope = await encryptPayload(payload, pass, {
        tool,
        label: filenameBase,
      });
      downloadJson(`${filenameBase}.enc.json`, envelope);
      onDone('Export cifrado AES-GCM listo · guarda la frase aparte');
      resetAndClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al cifrar');
      setBusy(false);
    }
  }

  return (
    <MrModal
      open={open}
      title="Exportar sesión"
      description={
        preferEncrypted
          ? 'Kit TLP y Selfradar pueden contener datos sensibles. Prefiere cifrado con frase.'
          : 'Elige export plano (JSON) o cifrado con frase (AES-GCM, solo en tu dispositivo).'
      }
      onClose={resetAndClose}
      initialFocusRef={passRef as RefObject<HTMLElement | null>}
      footer={
        <>
          <MrButton variant="ghost" onClick={resetAndClose} disabled={busy}>
            Cancelar
          </MrButton>
          <MrButton variant="primary" onClick={handleExport} disabled={busy}>
            {busy ? 'Cifrando…' : 'Exportar'}
          </MrButton>
        </>
      }
    >
      <fieldset className="mr-export-modes">
        <legend className="visually-hidden">Modo de export</legend>
        <label className="mr-check">
          <input
            type="radio"
            name="export-mode"
            checked={mode === 'plain'}
            onChange={() => setMode('plain')}
          />
          JSON plano
        </label>
        <label className="mr-check">
          <input
            type="radio"
            name="export-mode"
            checked={mode === 'encrypted'}
            onChange={() => setMode('encrypted')}
          />
          Cifrado (AES-GCM + frase)
        </label>
      </fieldset>

      {mode === 'encrypted' && (
        <div className="mr-export-pass">
          <div className="mr-field">
            <label htmlFor="mr-export-pass">Frase de cifrado (mín. 8)</label>
            <input
              ref={passRef}
              id="mr-export-pass"
              type="password"
              autoComplete="new-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              minLength={8}
              maxLength={128}
            />
          </div>
          <MrField
            id="mr-export-pass2"
            label="Repetir frase"
            type="password"
            value={pass2}
            onChange={setPass2}
            maxLength={128}
            showCount={false}
          />
          <p className="mr-card__hint">
            La frase no se guarda en el archivo ni en el servidor. Si la pierdes, no hay
            recuperación.
          </p>
        </div>
      )}
    </MrModal>
  );
}
