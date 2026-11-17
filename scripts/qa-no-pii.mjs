#!/usr/bin/env node
// Gate de privacidad. Tokeniza dist (minúsculas, sin marcas, palabras
// [a-z0-9]+, bigramas y trigramas de palabras vecinas) y falla si el hash
// está en la lista. La lista no guarda el texto en claro.
// También hashea secuencias de dígitos con aspecto de teléfono.
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
];

const TEXT = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.json', '.css']);

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

function digitRuns(text) {
  const runs = [];
  const re = /\+?\d[\d\s().-]{6,}\d/g;
  let match;
  while ((match = re.exec(text))) {
    const digits = match[0].replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) runs.push(digits);
  }
  return runs;
}

export function findDeniedTokens(text, deny = new Set(DENY_HASHES)) {
  const hits = new Set();
  for (const token of tokensOf(text)) {
    const hash = sha256(token);
    if (deny.has(hash)) hits.add(hash);
  }
  for (const digits of digitRuns(text)) {
    const hash = sha256(digits);
    if (deny.has(hash)) hits.add(hash);
  }
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
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log('qa:no-pii self-test: fixture plantada falla (1 hit); archivo limpio pasa (0 hits)');
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
