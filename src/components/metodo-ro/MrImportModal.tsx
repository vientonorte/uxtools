import { useRef, useState } from 'react';
import {
  decryptPayload,
  isEncryptedEnvelope,
  type EncryptedEnvelopeV1,
} from '../../lib/metodo-ro-crypto';
import { MrButton } from './MrButton';
import { MrField } from './MrField';
import { MrModal } from './MrModal';

interface MrImportModalProps {
  open: boolean;
  onClose: () => void;
  toolLabel: string;
  /** Called with decrypted/parsed session object after validation by parent */
  onImport: (data: unknown) => void;
  onError: (msg: string) => void;
}

export function MrImportModal({
  open,
  onClose,
  toolLabel,
  onImport,
  onError,
}: MrImportModalProps) {
  const [pass, setPass] = useState('');
  const [fileName, setFileName] = useState('');
  const [raw, setRaw] = useState<unknown>(null);
  const [encrypted, setEncrypted] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetAndClose() {
    setPass('');
    setFileName('');
    setRaw(null);
    setEncrypted(false);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  }

  function onFile(file: File | null) {
    if (!file) return;
    if (file.size > 2_000_000) {
      onError('Archivo demasiado grande (máx. 2 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const parsed = JSON.parse(text) as unknown;
        setRaw(parsed);
        setFileName(file.name.slice(0, 120));
        setEncrypted(isEncryptedEnvelope(parsed));
      } catch {
        onError('JSON inválido');
        setRaw(null);
        setEncrypted(false);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (raw == null) {
      onError('Elige un archivo primero');
      return;
    }
    setBusy(true);
    try {
      if (encrypted) {
        if (pass.length < 1) {
          onError('Ingresa la frase de cifrado');
          setBusy(false);
          return;
        }
        const plain = await decryptPayload(raw as EncryptedEnvelopeV1, pass);
        onImport(plain);
      } else {
        onImport(raw);
      }
      resetAndClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Error al importar');
      setBusy(false);
    }
  }

  return (
    <MrModal
      open={open}
      title={`Importar · ${toolLabel}`}
      description="Importa JSON plano o .enc.json cifrado. Todo se procesa en tu navegador."
      onClose={resetAndClose}
      footer={
        <>
          <MrButton variant="ghost" onClick={resetAndClose} disabled={busy}>
            Cancelar
          </MrButton>
          <MrButton
            variant="primary"
            onClick={handleImport}
            disabled={busy || raw == null}
          >
            {busy ? 'Importando…' : 'Importar'}
          </MrButton>
        </>
      }
    >
      <div className="mr-field">
        <label htmlFor="mr-import-file">Archivo JSON</label>
        <input
          ref={fileRef}
          id="mr-import-file"
          type="file"
          accept=".json,application/json"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {fileName ? (
          <p className="mr-card__hint">
            {fileName}
            {encrypted ? ' · cifrado detectado' : ' · JSON plano'}
          </p>
        ) : null}
      </div>
      {encrypted && (
        <MrField
          id="mr-import-pass"
          label="Frase de cifrado"
          type="password"
          value={pass}
          onChange={setPass}
          maxLength={128}
          showCount={false}
        />
      )}
    </MrModal>
  );
}
