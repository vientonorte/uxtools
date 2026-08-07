/**
 * Client-side encryption for Método Ro exports (Web Crypto).
 * AES-GCM-256 + PBKDF2-SHA-256. Passphrase never leaves the device.
 */

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

export interface EncryptedEnvelopeV1 {
  v: 1;
  format: 'metodo-ro-encrypted';
  alg: 'AES-GCM';
  kdf: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 ciphertext
  meta: {
    tool: string;
    createdAt: string;
    /** plain filename hint only — no secrets */
    label?: string;
  };
}

function b64Encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function b64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

export function isEncryptedEnvelope(data: unknown): data is EncryptedEnvelopeV1 {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return (
    o.v === 1 &&
    o.format === 'metodo-ro-encrypted' &&
    o.alg === 'AES-GCM' &&
    typeof o.salt === 'string' &&
    typeof o.iv === 'string' &&
    typeof o.ct === 'string'
  );
}

export async function encryptPayload(
  payload: unknown,
  passphrase: string,
  meta: { tool: string; label?: string }
): Promise<EncryptedEnvelopeV1> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('La frase debe tener al menos 8 caracteres');
  }
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto no disponible en este navegador');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plain
  );

  const outMeta: EncryptedEnvelopeV1['meta'] = {
    tool: meta.tool,
    createdAt: new Date().toISOString(),
  };
  if (meta.label) outMeta.label = meta.label;

  return {
    v: 1,
    format: 'metodo-ro-encrypted',
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    hash: 'SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: b64Encode(salt),
    iv: b64Encode(iv),
    ct: b64Encode(ct),
    meta: outMeta,
  };
}

export async function decryptPayload(
  envelope: EncryptedEnvelopeV1,
  passphrase: string
): Promise<unknown> {
  if (!passphrase) throw new Error('Ingresa la frase de cifrado');
  if (!isEncryptedEnvelope(envelope)) throw new Error('Archivo cifrado inválido');
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto no disponible en este navegador');
  }

  const salt = b64Decode(envelope.salt);
  const iv = b64Decode(envelope.iv);
  const ct = b64Decode(envelope.ct);
  const iterations =
    typeof envelope.iterations === 'number' && envelope.iterations >= 100_000
      ? envelope.iterations
      : PBKDF2_ITERATIONS;

  const key = await deriveKey(passphrase, salt, iterations);
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ct.buffer as ArrayBuffer
    );
    const text = new TextDecoder().decode(plainBuf);
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Frase incorrecta o archivo corrupto');
  }
}
