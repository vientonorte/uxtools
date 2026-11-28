#!/usr/bin/env node
// Emite public/pulso/assets/index-<hash>.js desde pulso/src/main.js.
// El nombre sale del contenido para que un teléfono no reutilice un bundle viejo.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'pulso/src/main.js'));
const hash = createHash('sha256').update(source).digest('hex').slice(0, 8);
const fileName = `index-${hash}.js`;
const assetDir = join(root, 'public/pulso/assets');
mkdirSync(assetDir, { recursive: true });
for (const name of readdirSync(assetDir)) {
  if (name.startsWith('index-') && name.endsWith('.js') && name !== fileName) {
    unlinkSync(join(assetDir, name));
  }
}
writeFileSync(join(assetDir, fileName), source);
const htmlPath = join(root, 'public/pulso/index.html');
const html = readFileSync(htmlPath, 'utf8').replace(
  /src="[^"]*\/pulso\/assets\/index-[^"]+\.js"/,
  `src="/uxtools/pulso/assets/${fileName}"`
);
writeFileSync(htmlPath, html);
console.log(`pulso asset ${fileName}`);
