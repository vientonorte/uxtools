/**
 * Optional platform WebAuthn. Private key never leaves the authenticator.
 * Failure is non-blocking (accessibility).
 */

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

export function webauthnAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
}

export async function registerOnboardPasskey(): Promise<string> {
  if (!webauthnAvailable()) {
    throw new Error('webauthn-unavailable');
  }
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'UX Tools · Método Ro', id: window.location.hostname },
      user: {
        id: userId,
        name: 'uxtools-local',
        displayName: 'UX Tools local',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('cancelled');
  return bufToB64(cred.rawId);
}
