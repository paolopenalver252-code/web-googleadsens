#!/usr/bin/env node
/**
 * Ejecuta un comando con variables de entorno, de forma multiplataforma
 * (npm usa cmd.exe en Windows, donde `VAR=1 comando` no funciona).
 *
 *   node scripts/run-with-env.mjs CLAVE=valor [CLAVE2=valor] -- comando args…
 */
import { spawn } from 'node:child_process';

const separator = process.argv.indexOf('--');
if (separator === -1 || separator === process.argv.length - 1) {
  console.error('Uso: run-with-env.mjs CLAVE=valor -- comando [args]');
  process.exit(2);
}

const env = { ...process.env };
for (const pair of process.argv.slice(2, separator)) {
  const index = pair.indexOf('=');
  if (index <= 0) {
    console.error(`Variable inválida: "${pair}"`);
    process.exit(2);
  }
  env[pair.slice(0, index)] = pair.slice(index + 1);
}

// Los argumentos son fijos (definidos en package.json), no entrada de usuario.
const command = process.argv.slice(separator + 1).join(' ');
const child = spawn(command, { env, stdio: 'inherit', shell: true });
child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1));
});
