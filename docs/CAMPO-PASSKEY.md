# Campo · etnografía en /uxtools/campo/

Origen: vientonorte/etnografia-campo rama ds-vn @ 69346eb (anonimizada, códigos P1…P11). Archivos estáticos en `public/campo/`; Vite los copia a `dist/campo/`.

## Cifrado
- Siempre cifrado AES-GCM 256 en localStorage (`campo.etnografia.v1`). No hay modo en claro ni servidor ni cuentas.
- **Passkey (preferido):** WebAuthn con extensión PRF, rpId = `location.hostname` (vientonorte.io en producción).
  1. Primer uso → «Crear passkey y cifrar»: `credentials.create` (residentKey required, UV required, `prf.eval.first = prfSalt` 32 B aleatorios). Si `create` no entrega la salida PRF (iCloud Keychain), se hace un `credentials.get` inmediato.
  2. Clave = HKDF-SHA256(salidaPRF, salt 16 B, info «campo.etnografia aes-gcm v1») → AES-GCM.
  3. Blob guarda solo `kdf: WEBAUTHN-PRF-HKDF-SHA256`, `credId`, `prfSalt`, `salt`, `iv`, `data`. Sin la passkey no hay descifrado (no hay frase de respaldo en ese estudio).
  4. Desbloqueo → «Desbloquear con passkey»: `credentials.get` con allowCredentials = credId y el mismo prfSalt.
- **Fallback sin PRF:** clave del investigador, PBKDF2-SHA256 600.000 iteraciones (blobs antiguos 120k se migran al abrir).
- Si el dispositivo no entrega PRF se muestra el aviso y se usa la clave.

## Requisitos PRF
iOS/iPadOS 18+ o macOS 15+ con Safari y passkey en Apple Contraseñas / iCloud Keychain. No se puede probar en WebKit headless: allí el botón falla cerrado (no guarda nada) y se prueba el fallback.

## Privacidad
`<meta name="robots" content="noindex">` (GitHub Pages no permite cabeceras). Sin analítica, sin terceros, sin datos reales en el código (solo seed de demostración ficticio).

## Riesgo
Borrar la passkey o los datos del sitio en Safari = pérdida irreversible. Exportar con frecuencia.
