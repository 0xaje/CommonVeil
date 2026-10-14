import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Pre-build check rejects production VITE_INDEXER_URI overrides', () => {
  // 1. Unsafe override with NODE_ENV=production must exit with non-zero code
  const failRes = spawnSync(
    'node',
    ['scripts/prebuild-check.mjs'],
    {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        VITE_INDEXER_URI: 'https://midnight-preprod.blockfrost.io/api/v0?project_id=secret123',
      },
      encoding: 'utf8',
    }
  );

  assert.notEqual(failRes.status, 0, 'Build must fail when VITE_INDEXER_URI is supplied in production');
  assert.match(
    failRes.stderr,
    /PRE-BUILD SECURITY ERROR/,
    'Error message must indicate pre-build security error'
  );

  // 2. Safe environment (no overrides) must exit 0
  const passRes = spawnSync(
    'node',
    ['scripts/prebuild-check.mjs'],
    {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        VITE_INDEXER_URI: '',
        VITE_INDEXER_WS_URI: '',
      },
      encoding: 'utf8',
    }
  );

  assert.equal(passRes.status, 0, 'Build must pass when no overrides are present');
  assert.match(passRes.stdout, /PASS pre-build security check/);
});
