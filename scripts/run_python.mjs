import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isWindows = os.platform() === 'win32';

// Resolve to project root .venv
const venvPython = isWindows
  ? path.resolve(__dirname, '..', '.venv', 'Scripts', 'python.exe')
  : path.resolve(__dirname, '..', '.venv', 'bin', 'python');

const args = process.argv.slice(2);
const child = spawn(venvPython, args, { stdio: 'inherit' });

child.on('error', (err) => {
  console.error(`\x1b[31mError: Failed to start python from .venv\x1b[0m`);
  console.error(`Details: ${err.message}`);
  console.error(`Please make sure you have created the virtual environment by running: \n  npm run venv:setup`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code !== null ? code : 1);
});
