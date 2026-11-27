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

// Name tokens are unsalted SHA-256. A dictionary can reverse common given
// names; that limitation is accepted for now. Follow-up: HMAC with a GitHub
// Actions secret so the list is not reversible offline. Do not add that secret
// in this repo.
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
  'd27401c995de2d81e8a16e7352d95a04a8be8ed2c95a84be1682ed3ec5979d9b',
  'd68cc2c226778f145f7204b8acca524e498b56bfa69ce9ffad48933ec6d7aff1',
  'f4027eaf2f218156bba9de620f9be0ca2d25472e600666b7e739072a4e4e4f84',
  '034a2a475c9a28ce53874bcb3d2d38efbc643c168aa5487182b71244d27e7a93',
  '7381e3ddaa47ef9e526cea785d485180d0f006fcb175cc2913171735936e3df2',
];

/** Synthetic numbers used only by the self-test. Production scans ignore these exact digit strings. */
export const SYNTHETIC_PHONE_ALLOWLIST = new Set([
  '56911111111',
  '911111111',
  '11111111',
]);

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

function decodeUnicodeEscapes(text) {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function digitsOnly(value) {
  return value.replace(/\D/g, '');
}

function isAllowlisted(digits, allowlist) {
  if (!allowlist || allowlist.size === 0) return false;
  if (allowlist.has(digits)) return true;
  const country = digits.match(/^56(9\d{8})$/);
  if (country && (allowlist.has(country[1]) || allowlist.has(digits.slice(-8)))) return true;
  return false;
}

/**
 * Chilean mobile (+56 9 and 8 more digits, separators allowed), a national
 * 9-digit mobile in a phone-like context or with separators, and any
 * wa.me/<digits> or tel:<digits> link. No stored phone hashes.
 */
export function findPhoneLeaks(text, allowlist = new Set()) {
  const hits = [];
  const source = decodeUnicodeEscapes(text);
  const consider = (label, raw) => {
    const digits = digitsOnly(raw);
    if (digits.length < 8) return;
    if (isAllowlisted(digits, allowlist)) return;
    hits.push(label);
  };

  for (const match of source.matchAll(/wa\.me\/(\d{6,15})/gi)) consider('wa.me', match[1]);
  for (const match of source.matchAll(/tel:\+?(\d{6,15})/gi)) consider('tel', match[1]);

  const chile = /(?:\+|00)?\s*\(?\s*56\s*\)?[\s.-]*9[\s.-]*\d{4}[\s.-]*\d{4}(?!\d)/g;
  for (const match of source.matchAll(chile)) consider('cl-mobile', match[0]);
  const compact = /(?<!\d)569\d{8}(?!\d)/g;
  for (const match of source.matchAll(compact)) consider('cl-mobile', match[0]);

  const grouped = /(?<!\d)9(?:\d{4}[\s.-]\d{4}|[\s.-]\d{4}[\s.-]\d{4})(?!\d)/g;
  for (const match of source.matchAll(grouped)) consider('cl-national', match[0]);

  const bare = /(?<!\d)9\d{8}(?!\d)/g;
  for (const match of source.matchAll(bare)) {
    const before = source.slice(Math.max(0, match.index - 48), match.index).toLowerCase();
    if (!/tel:|wa\.me|whatsapp|phone|tel[eé]fono|m[oó]vil|llamar|contacto/.test(before)) continue;
    consider('cl-national', match[0]);
  }
  return hits;
}

function loadBrandScope() {
  const file = join(process.cwd(), 'src/pages/Instafotos/data.ts');
  if (!existsSync(file)) return { strings: [], allowedHashes: new Set() };
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('INITIAL_CONFIG');
  const end = source.indexOf('DEFAULT_PARKS');
  const block = start >= 0 && end > start ? source.slice(start, end) : '';
  const name = (block.match(/name:\s*"([^"]*)"/) || [])[1] || '';
  const instagram = (block.match(/instagram:\s*"([^"]*)"/) || [])[1] || '';
  const strings = [name, instagram].filter((value) => value.length > 0);
  const allowedHashes = new Set();
  const deny = new Set(DENY_HASHES);
  for (const value of strings) {
    for (const token of tokensOf(value)) {
      const hash = sha256(token);
      if (deny.has(hash)) allowedHashes.add(hash);
    }
  }
  return { strings, allowedHashes };
}

function inInstafotosScope(rel) {
  const name = rel.replace(/\\/g, '/');
  return /(?:^|\/)Instafotos(?:\/|-[^/]+\.js$)/.test(name);
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

export function findDeniedTokens(text, deny = new Set(DENY_HASHES), allowlist = new Set()) {
  const hits = new Set();
  const decoded = decodeUnicodeEscapes(text);
  const consider = (value) => {
    for (const token of tokensOf(value)) {
      const hash = sha256(token);
      if (deny.has(hash)) hits.add(hash);
    }
  };
  consider(decoded);
  for (const leak of findPhoneLeaks(decoded, allowlist)) hits.add(`phone:${leak}`);
  for (const literal of decodedLiterals(decoded)) consider(literal);
  return [...hits];
}

export function scanDist(root, deny = new Set(DENY_HASHES)) {
  const hits = [];
  let files = 0;
  const brand = loadBrandScope();

  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const rel = relative(root, abs);
      for (const hash of findDeniedTokens(name, deny)) {
        if (inInstafotosScope(rel) && brand.allowedHashes.has(hash)) continue;
        hits.push(`nombre de archivo: ${rel} → ${hash}`);
      }
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      files += 1;
      const ext = extname(name).toLowerCase();
      if (!TEXT.has(ext)) continue;
      const text = readFileSync(abs, 'utf8');
      const scoped = inInstafotosScope(rel);
      for (const hash of findDeniedTokens(text, deny)) {
        if (scoped && brand.allowedHashes.has(hash)) continue;
        hits.push(`contenido: ${rel} → ${hash}`);
      }
      if (!scoped) {
        for (const value of brand.strings) {
          if (text.includes(value)) hits.push(`marca fuera de Instafotos: ${rel}`);
        }
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
    assertHits('unicode-escape', '\\u0070lantedfixture', deny);

    const none = new Set();
    const formats = [
      ['plus-cc', '+56 9 1111 1111'],
      ['digits-cc', '56911111111'],
      ['spaced-cc', '56 9 1111 1111'],
      ['paren-cc', '(+56) 9 1111 1111'],
      ['dashed-cc', '56-9-1111-1111'],
      ['wa', 'https://wa.me/56911111111'],
      ['tel', 'tel:+56911111111'],
      ['bare-9', 'llamar 911111111'],
      ['spaced-9', '9 1111 1111'],
      ['dashed-9', '91111-1111'],
    ];
    for (const [label, sample] of formats) {
      if (findPhoneLeaks(sample, none).length === 0) throw new Error(`fixture debía fallar: ${label}`);
      if (findPhoneLeaks(sample, SYNTHETIC_PHONE_ALLOWLIST).length !== 0) {
        throw new Error(`allowlist debía ignorar la fixture: ${label}`);
      }
    }
    if (findPhoneLeaks('tel:+56922222222', SYNTHETIC_PHONE_ALLOWLIST).length === 0) {
      throw new Error('un número fuera de la allowlist debía fallar');
    }

    const brand = loadBrandScope();
    if (brand.strings.length < 2) throw new Error('falta la marca pública de Instafotos');
    const chunk = join(dir, 'Instafotos-fixture.js');
    const other = join(dir, 'hub-other.js');
    writeFileSync(chunk, brand.strings.join('\n'));
    writeFileSync(other, brand.strings.join('\n'));
    const scoped = scanDist(dir, new Set());
    if (!scoped.hits.some((hit) => hit.includes('hub-other.js'))) {
      throw new Error('la marca fuera de Instafotos debía fallar');
    }
    if (scoped.hits.some((hit) => hit.includes('Instafotos-fixture.js') && hit.startsWith('marca'))) {
      throw new Error('la marca dentro de Instafotos no debía fallar');
    }
    writeFileSync(chunk, `${brand.strings.join('\n')}\ntel:+56922222222\n`);
    const withPhone = scanDist(dir, new Set());
    if (!withPhone.hits.some((hit) => hit.includes('Instafotos-fixture.js') && hit.includes('phone:'))) {
      throw new Error('un teléfono dentro de Instafotos debía fallar');
    }
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
