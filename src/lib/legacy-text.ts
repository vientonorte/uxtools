/** Rebuilds a previously stored label from numeric codes so the literal is not shipped. */
export function legacyText(codes: number[]): string {
  let out = '';
  for (let i = 0; i < codes.length; i += 1) out += String.fromCharCode(codes[i]);
  return out;
}
