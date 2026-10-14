/**
 * Pre-build security check: prevents bundling client-side environment overrides
 * in production builds. Any VITE_* variable is baked directly into browser JavaScript
 * during `vite build`. Rejecting overrides here prevents secrets from ever entering
 * generated production assets.
 */
import { existsSync, readFileSync } from 'node:fs';

const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

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
      // If it contains a real or non-empty value
      if (!val.includes('YOUR_MIDNIGHT_PREPROD_PROJECT_ID') && !val.includes('YOUR_PROJECT_ID')) {
        throw new Error(
          `PRE-BUILD SECURITY ERROR: Production builds must not contain ${key} in ${filePath}. ` +
          `Client-side VITE_* variables are baked into public browser bundles and leak API tokens. ` +
          `Production CommonVeil derives indexer endpoints directly from the connected Midnight wallet.`
        );
      }
    }
  }
}

function checkProcessEnv() {
  const unsafeVars = ['VITE_INDEXER_URI', 'VITE_INDEXER_WS_URI'];
  for (const key of unsafeVars) {
    const val = process.env[key]?.trim();
    if (val && val.length > 0 && !val.includes('YOUR_PROJECT_ID')) {
      throw new Error(
        `PRE-BUILD SECURITY ERROR: Production builds must not supply ${key} via environment variables. ` +
        `Client-side VITE_* variables are baked into public browser bundles and leak API tokens. ` +
        `Production CommonVeil derives indexer endpoints directly from the connected Midnight wallet.`
      );
    }
  }
}

if (isProduction) {
  checkProcessEnv();
  checkEnvFile('.env');
  checkEnvFile('.env.production');
  checkEnvFile('.env.production.local');
}

console.log('PASS pre-build security check: no production VITE_* indexer overrides detected');
