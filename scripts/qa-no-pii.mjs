#!/usr/bin/env node
// Gate de privacidad. Tokeniza dist (minúsculas, sin marcas, palabras
// [a-z0-9]+, bigramas y trigramas) y falla si el hash está en la lista.
// La lista no guarda el texto en claro. También cubre dígitos de teléfono
// (con y sin prefijo de país) y literales fromCharCode / arrays numéricos.
// Uso: node scripts/qa-no-pii.mjs [dist]
//      node scripts/qa-no-pii.mjs --self-test
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative } from 'node:path';

export const DENY_HASHES = [
  '80f563ecc98a3145fc14237415b486396ec6be5e9826ccd0d6ff1686ef2ffc50',
  '3a48d3ed7d6c02fb57e559562865cc40e58aeaa1920bbf6017cda684703ba73f',
  '16b02287e8a9f1d5bb5a4afacaf6ac7124c62846bad58d8f48acc27598a2cb7a',
  'c9fd92c735c7609969a0ab48b6dc2fda85a06e135196571c06708222baf5a2e7',
  'e09c14dea2322c24cb499a6c310ff1f878c628ef229569307611b8ab118f3584',
  'fd3aef6217124ed83689d4835de94079d14bff5c84f0b41117d991a2759c516e',
  '69b382cba8f3a872dc5643066c8c7630c61126963bb41d5f8222197202b190e1',
  '59e13abf8b33b5198efd51c15e5f2b22a7bb99388b0f8bf5257840fd13820913',
  '7718a2da303893a7e9e7c4207b141a8c93e6feb2c2a185a93ed5ef2950976ecf',
  '433c5861e58c488bde3a98fa6808f4b332f8621d8bd454cc0296b444a2db914e',
  'd40485ec618660a7f92327e5dbe2068de53198072a67fb9f162158f974a48898',
  '6c4501886549e00e0402a952b878d8c7154b3e9033abe7d9989949e9cc06ced1',
  '3edbfd4d9535c943e9e6fbda39edc2d89e9254e027190fe7f0ac60b806cffa6b',
  'd27401c995de2d81e8a16e7352d95a04a8be8ed2c95a84be1682ed3ec5979d9b',
  'd68cc2c226778f145f7204b8acca524e498b56bfa69ce9ffad48933ec6d7aff1',
  'f4027eaf2f218156bba9de620f9be0ca2d25472e600666b7e739072a4e4e4f84',
  '034a2a475c9a28ce53874bcb3d2d38efbc643c168aa5487182b71244d27e7a93',
  '7381e3ddaa47ef9e526cea785d485180d0f006fcb175cc2913171735936e3df2',
];

const TEXT = new Set([
  '.html', '.htm', '.js', '.mjs', '.cjs', '.json', '.css',
  '.map', '.svg', '.txt', '.webmanifest', '.xml', '.md',
]);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function foldAccents(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Palabras y la unión de cada par y trío vecino (espacio y guion ya no están). */
export function tokensOf(text) {
  const words = foldAccents(text).toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const out = new Set(words);
  for (let i = 0; i < words.length - 1; i += 1) out.add(words[i] + words[i + 1]);
  for (let i = 0; i < words.length - 2; i += 1) out.add(words[i] + words[i + 1] + words[i + 2]);
  return out;
}

function addPhoneDigits(found, digits) {
  if (!/^\d{8,15}$/.test(digits)) return;
  found.add(digits);
  const country = digits.match(/^56(9\d{8})$/);
  if (country) {
    found.add(country[1]);
    found.add(digits.slice(-8));
  }
}

/** Dígitos de teléfono, incluido el núcleo de 9 cuando el run es 56 + ese núcleo. */
export function digitCandidates(text) {
  const found = new Set();
  const runs = text.match(/(?:\+|00)?\(?\d[\d\s().-]{5,}\d\)?/g) ?? [];
  for (const run of runs) addPhoneDigits(found, run.replace(/\D/g, ''));
  for (const match of text.matchAll(/wa\.me\/(\d{8,15})/gi)) addPhoneDigits(found, match[1]);
  for (const match of text.matchAll(/tel:\+?(\d{8,15})/gi)) addPhoneDigits(found, match[1]);
  return [...found];
}

function decodedLiterals(text) {
  const out = [];
  const fromRe = /String\.fromCharCode(?:\.apply\(\s*(?:null|void 0)\s*,\s*)?\(?\s*(\d+(?:\s*,\s*\d+)*)/g;
  let match;
  while ((match = fromRe.exec(text))) {
    const nums = match[1].split(',').map((part) => Number(part.trim()));
    if (nums.length >= 3 && nums.every((n) => n >= 32 && n <= 126)) {
      out.push(String.fromCharCode(...nums));
    }
  }
  const arrayRe = /\[(\d{2,3}(?:\s*,\s*\d{2,3}){3,60})\]/g;
  while ((match = arrayRe.exec(text))) {
    const nums = match[1].split(',').map((part) => Number(part.trim()));
    if (nums.every((n) => n >= 32 && n <= 126)) out.push(String.fromCharCode(...nums));
  }
  return out;
}

export function findDeniedTokens(text, deny = new Set(DENY_HASHES)) {
  const hits = new Set();
  const consider = (value) => {
    for (const token of tokensOf(value)) {
      const hash = sha256(token);
      if (deny.has(hash)) hits.add(hash);
    }
  };
  consider(text);
  for (const digits of digitCandidates(text)) {
    const hash = sha256(digits);
    if (deny.has(hash)) hits.add(hash);
  }
  for (const decoded of decodedLiterals(text)) consider(decoded);
  return [...hits];
}

export function scanDist(root, deny = new Set(DENY_HASHES)) {
  const hits = [];
  let files = 0;

  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const rel = relative(root, abs);
      for (const hash of findDeniedTokens(name, deny)) {
        hits.push(`nombre de archivo: ${rel} → ${hash}`);
      }
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      files += 1;
      const ext = extname(name).toLowerCase();
      if (!TEXT.has(ext)) continue;
      for (const hash of findDeniedTokens(readFileSync(abs, 'utf8'), deny)) {
        hits.push(`contenido: ${rel} → ${hash}`);
      }
    }
  }

  if (!existsSync(root)) throw new Error(`falta ${root}`);
  walk(root);
  return { hits, files };
}

function assertHits(label, text, deny) {
  const hits = findDeniedTokens(text, deny);
  if (!hits.length) throw new Error(`fixture debía fallar: ${label}`);
}

export function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'qa-no-pii-'));
  const token = 'plantedfixture';
  const deny = new Set([sha256(token)]);
  const file = join(dir, 'planted.js');
  try {
    writeFileSync(file, `export const sample = "${token}";\n`);
    const failed = scanDist(dir, deny);
    if (failed.hits.length !== 1) {
      throw new Error(`la fixture plantada debía fallar, hits=${failed.hits.length}`);
    }
    writeFileSync(file, 'export const sample = "clean-template";\n');
    const clean = scanDist(dir, deny);
    if (clean.hits.length !== 0) {
      throw new Error(`la fixture limpia debía pasar, hits=${clean.hits.length}`);
    }

    const codes = [...token].map((ch) => ch.charCodeAt(0));
    assertHits('fromCharCode', `String.fromCharCode(${codes.join(',')})`, deny);
    assertHits('array', `const legacy = [${codes.join(',')}];`, deny);

    const realCodes = [99, 97, 109, 105, 108, 97];
    assertHits('real-char-array', `[${realCodes.join(',')}]`, new Set(DENY_HASHES));

    const full = '56911111111';
    const core = '911111111';
    const last8 = '11111111';
    const phoneDeny = new Set([sha256(full), sha256(core), sha256(last8)]);
    const formats = [
      ['plus-cc', '+56911111111'],
      ['digits-cc', '56911111111'],
      ['spaced-cc', '+56 9 1111 1111'],
      ['bare-cc', '56 9 1111 1111'],
      ['paren-cc', '(+56) 9 1111 1111'],
      ['dashed-cc', '56-9-1111-1111'],
      ['wa', 'https://wa.me/56911111111'],
      ['tel', 'tel:+56911111111'],
      ['bare-9', '911111111'],
      ['spaced-9', '9 1111 1111'],
      ['dashed-9', '91111-1111'],
    ];
    for (const [label, sample] of formats) assertHits(label, sample, phoneDeny);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log('qa:no-pii self-test: fixtures (texto, fromCharCode, array, formatos de teléfono) fallan; archivo limpio pasa');
}

const invoked = process.argv[1] && /qa-no-pii\.mjs$/.test(process.argv[1]);
if (invoked) {
  if (process.argv.includes('--self-test')) {
    selfTest();
  } else {
    const root = process.argv[2] || 'dist';
    const { hits, files } = scanDist(root);
    if (hits.length) {
      console.error(`token denegado en ${root}/ (${hits.length}):`);
      for (const hit of hits) console.error(`  - ${hit}`);
      process.exit(1);
    }
    console.log(`${root}/ sin tokens denegados — ${files} archivos, 0 hits`);
  }
}
