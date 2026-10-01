#!/usr/bin/env node
/**
 * Presupuesto de rendimiento: mide el JavaScript INICIAL de cada página del
 * build (gzip nivel 9) y falla si supera el presupuesto.
 *
 *   - Página con isla (<astro-island>) → presupuesto de calculadora.
 *   - Página sin islas → presupuesto de contenido.
 *
 * JS inicial = scripts de módulo, modulepreload, componentes y renderers de
 * las islas y scripts inline, siguiendo sus imports estáticos. Los `import()`
 * dinámicos se informan aparte como carga diferida.
 *
 *   node scripts/check-budget.mjs <directorio-del-build>
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(process.argv[2] ?? 'dist');
if (!existsSync(root)) {
  console.error(`No existe el directorio de build: ${root}`);
  process.exit(2);
}
const budget = JSON.parse(readFileSync(resolve('performance-budget.json'), 'utf8'));

const gzipSize = (content) => gzipSync(content, { level: 9 }).length;
const kb = (bytes) => (bytes / 1024).toFixed(2);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function resolveAsset(url, fromFile) {
  if (/^(https?:)?\/\//.test(url)) return { external: url };
  const clean = url.split(/[?#]/)[0];
  return { file: clean.startsWith('/') ? join(root, clean) : resolve(dirname(fromFile), clean) };
}

const STATIC_IMPORT = /(?:import|export)\s*(?:[\w$*{}\s,]+from\s*)?["']([^"']+\.m?js)["']/g;
// Vite emite los import() dinámicos con comillas invertidas (import(`./x.js`)).
const DYNAMIC_IMPORT = /import\(\s*["'`]([^"'`]+\.m?js)["'`]\s*\)/g;

function collectModule(file, initial, lazy) {
  if (initial.has(file)) return;
  initial.add(file);
  const source = readFileSync(file, 'utf8');
  for (const [, spec] of source.matchAll(STATIC_IMPORT)) {
    const target = resolveAsset(spec, file);
    if (target.file) collectModule(target.file, initial, lazy);
  }
  for (const [, spec] of source.matchAll(DYNAMIC_IMPORT)) {
    const target = resolveAsset(spec, file);
    if (target.file) lazy.add(target.file);
  }
}

const rows = [];
let failed = false;

for (const htmlFile of walk(root).filter((file) => file.endsWith('.html'))) {
  const html = readFileSync(htmlFile, 'utf8');
  const initial = new Set();
  const lazy = new Set();
  const external = [];

  const urls = [
    ...[...html.matchAll(/<script[^>]*\stype="module"[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\s(?:component-url|renderer-url|before-hydration-url)="([^"]+)"/g)].map(
      (m) => m[1],
    ),
  ].filter(Boolean);

  for (const url of urls) {
    const target = resolveAsset(url, htmlFile);
    if (target.external) external.push(target.external);
    else collectModule(target.file, initial, lazy);
  }

  const inlineScripts = [
    ...html.matchAll(
      /<script(?![^>]*\ssrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ]
    .map((m) => m[1])
    .join('\n');

  const initialBytes =
    [...initial].reduce((sum, file) => sum + gzipSize(readFileSync(file)), 0) +
    (inlineScripts.trim() === '' ? 0 : gzipSize(inlineScripts));
  const lazyOnly = [...lazy].filter((file) => !initial.has(file));
  const lazyBytes = lazyOnly.reduce((sum, file) => sum + gzipSize(readFileSync(file)), 0);

  const isCalculatorPage = html.includes('<astro-island');
  const limitKB = isCalculatorPage ? budget.calculatorPageJsGzipKB : budget.contentPageJsGzipKB;
  const ok = initialBytes / 1024 <= limitKB && external.length === 0;
  if (!ok) failed = true;

  rows.push({
    página: `/${relative(root, htmlFile).replaceAll('\\', '/')}`,
    tipo: isCalculatorPage ? 'calculadora' : 'contenido',
    'JS inicial (kB gz)': kb(initialBytes),
    'diferido (kB gz)': kb(lazyBytes),
    presupuesto: `${String(limitKB)} kB`,
    externos: external.length,
    estado: ok ? 'OK' : 'SUPERADO',
  });
}

const css = walk(root).filter((file) => file.endsWith('.css'));
console.table(rows);
for (const file of css) {
  console.log(`CSS ${relative(root, file)}: ${kb(gzipSize(readFileSync(file)))} kB gz`);
}

if (failed) {
  console.error(
    '\nPresupuesto de rendimiento SUPERADO (o scripts externos). Ver docs/performance.md.',
  );
  process.exit(1);
}
console.log('\nPresupuesto de rendimiento: OK');
