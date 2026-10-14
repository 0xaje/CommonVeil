/**
 * Pre-build security check: prevents bundling client-side environment overrides
 * in any build execution. Any VITE_* variable is baked directly into browser JavaScript
 * during `vite build`. Rejecting overrides here prevents secrets or misconfigurations
 * from ever entering generated production assets.
 */
import { existsSync, readFileSync, rmSync } from 'node:fs';

function cleanDist() {
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
}

function checkEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim();
    if ((key === 'VITE_INDEXER_URI' || key === 'VITE_INDEXER_WS_URI') && val.length > 0) {
      cleanDist();
      throw new Error(
        `PRE-BUILD SECURITY ERROR: Build cannot proceed with ${key} set in ${filePath}. ` +
        `Client-side VITE_* variables are baked directly into public browser bundles and leak credentials. ` +
        `CommonVeil derives indexer endpoints directly from the connected Midnight wallet.`
      );
    }
  }
}

function checkProcessEnv() {
  const unsafeVars = ['VITE_INDEXER_URI', 'VITE_INDEXER_WS_URI'];
  for (const key of unsafeVars) {
    const val = process.env[key]?.trim();
    if (val && val.length > 0) {
      cleanDist();
      throw new Error(
        `PRE-BUILD SECURITY ERROR: Build cannot proceed with ${key} set in process environment. ` +
        `Client-side VITE_* variables are baked directly into public browser bundles and leak credentials. ` +
        `CommonVeil derives indexer endpoints directly from the connected Midnight wallet.`
      );
    }
  }
}

// 1. Process environment variables
checkProcessEnv();

// 2. All standard Vite environment files
const envFilesToCheck = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  '.env.development',
  '.env.development.local',
];

for (const envFile of envFilesToCheck) {
  checkEnvFile(envFile);
}

console.log('PASS pre-build security check: no VITE_* indexer overrides detected in environment or config files');
