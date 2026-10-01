#!/usr/bin/env node
/**
 * Verificación del build de PRODUCCIÓN (dist/). Falla si:
 *   - contiene páginas o fixtures de prueba;
 *   - contiene cualquier script de publicidad/analítica de Google u otros
 *     (no debe cargarse ninguno en esta fase);
 *   - alguna página HTML carece de lang, description, canonical, robots,
 *     CSP o de exactamente un <h1>;
 *   - el canonical de una página no apunta a su propia ruta (URL duplicada);
 *   - el sitemap enumera una URL que no existe en el build;
 *   - faltan robots.txt, sitemap o 404, o robots.txt bloquea el rastreo.
 *
 *   node scripts/check-dist.mjs [dist]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const problems = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(root)) {
  console.error(`No existe ${root}. Ejecuta antes "npm run build".`);
  process.exit(2);
}

const files = walk(root);
const rel = (file) => relative(root, file).replaceAll('\\', '/');

const FORBIDDEN_CONTENT = [
  'test-harness',
  'test-echo',
  'googlesyndication',
  'adsbygoogle',
  'googletagmanager',
  'google-analytics',
  'doubleclick',
  'gtag(',
];

for (const file of files) {
  if (rel(file).includes('test-harness'))
    problems.push(`Archivo de prueba en producción: ${rel(file)}`);
  if (!/\.(html|js|css|xml|txt|svg)$/.test(file)) continue;
  const content = readFileSync(file, 'utf8');
  for (const needle of FORBIDDEN_CONTENT) {
    if (content.includes(needle)) problems.push(`"${needle}" encontrado en ${rel(file)}`);
  }
}

const REQUIRED_IN_HTML = [
  ['lang', /<html[^>]*\slang="es-ES"/],
  ['meta description', /<meta name="description" content="[^"]+"/],
  ['canonical', /<link rel="canonical" href="https:\/\/[^"]+"/],
  ['meta robots', /<meta name="robots" content="[^"]+"/],
  ['CSP', /<meta http-equiv="content-security-policy" content="[^"]*script-src/],
];

for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const [name, pattern] of REQUIRED_IN_HTML) {
    if (!pattern.test(html)) problems.push(`${rel(file)}: falta ${name}`);
  }
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) problems.push(`${rel(file)}: ${String(h1Count)} elementos <h1> (se espera 1)`);
}

// Una URL por página: el canonical de cada HTML apunta a SU propia ruta
// (index.html → "/", x.html → "/x"), sin barra final ni extensión.
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (canonical === undefined) continue; // ya informado arriba
  const page = rel(file).replace(/\.html$/, '');
  const expected = page === 'index' ? '/' : `/${page}`;
  if (new URL(canonical).pathname !== expected) {
    problems.push(`${rel(file)}: canonical ${canonical} no corresponde a ${expected}`);
  }
}

// El sitemap solo enumera páginas que existen en el build.
for (const sitemap of files.filter((f) => /sitemap-\d+\.xml$/.test(f))) {
  for (const [, loc] of readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const pathname = new URL(loc).pathname;
    const target = pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`;
    if (!existsSync(join(root, target))) {
      problems.push(`${rel(sitemap)}: ${loc} no existe en el build`);
    }
  }
}

for (const required of ['404.html', 'robots.txt', 'sitemap-index.xml']) {
  if (!existsSync(join(root, required))) problems.push(`Falta ${required}`);
}
if (existsSync(join(root, 'robots.txt'))) {
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  if (/^Disallow:\s*\/\s*$/m.test(robots)) problems.push('robots.txt bloquea todo el rastreo');
}

if (problems.length > 0) {
  console.error('Verificación del build FALLIDA:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Verificación del build: OK (${String(files.length)} archivos)`);
