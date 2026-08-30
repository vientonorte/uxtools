/* ── PASSKEY · Device-storage only ────────────────────────────
 * WebAuthn credential stays on the device + its rawId in
 * localStorage['vn-passkey-id'].  No server, no fetch().
 * attestation: 'none', userVerification: 'preferred'.
 * ─────────────────────────────────────────────────────────── */
(function (global) {
  var STORAGE_KEY = 'vn-passkey-id';

  /* ── helpers ──────────────────────────────────────────── */
  function b64ToUint8(b64) {
    var binary = atob(b64);
    var bytes  = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bufToB64(buf) {
    var bytes = new Uint8Array(buf);
    var s = '';
    bytes.forEach(function (b) { s += String.fromCharCode(b); });
    return btoa(s);
  }

  /* ── public API ───────────────────────────────────────── */

  /** Returns true when the browser supports WebAuthn. */
  function passkeyAvailable() {
    return (
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      typeof navigator.credentials !== 'undefined'
    );
  }

  /** Returns true when a passkey rawId is already saved locally. */
  function passkeyRegistered() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
  }

  /**
   * Register a new passkey for this device.
   * Saves rawId (base64) to localStorage.
   * @returns {Promise<string>} base64 rawId
   */
  function registerPasskey() {
    if (!passkeyAvailable()) return Promise.reject(new Error('webauthn-unavailable'));

    var challenge = crypto.getRandomValues(new Uint8Array(32));
    var userId    = crypto.getRandomValues(new Uint8Array(16));

    return navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: {
          name: 'UX Tools · vientonorte',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: 'uxtools-local',
          displayName: 'UX Tools local'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7   },  /* ES256 */
          { type: 'public-key', alg: -257 }   /* RS256 */
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }
    }).then(function (cred) {
      if (!cred) throw new Error('cancelled');
      var id = bufToB64(cred.rawId);
      localStorage.setItem(STORAGE_KEY, id);
      return id;
    });
  }

  /**
   * Verify the stored passkey via navigator.credentials.get().
   * @returns {Promise<boolean>}
   */
  function verifyPasskey() {
    if (!passkeyAvailable()) return Promise.reject(new Error('webauthn-unavailable'));
    var savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return Promise.reject(new Error('no-passkey-registered'));

    var challenge = crypto.getRandomValues(new Uint8Array(32));

    return navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          type: 'public-key',
          id: b64ToUint8(savedId).buffer,
          transports: ['internal']
        }],
        userVerification: 'preferred',
        timeout: 60000
      }
    }).then(function (assertion) {
      return !!assertion;
    });
  }

  /** Remove passkey rawId from localStorage. */
  function clearPasskey() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* pass */ }
  }

  /* ── export ───────────────────────────────────────────── */
  global.Passkey = {
    available:  passkeyAvailable,
    registered: passkeyRegistered,
    register:   registerPasskey,
    verify:     verifyPasskey,
    clear:      clearPasskey
  };
})(window);
