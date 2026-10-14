import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';

test('Pre-build check rejects VITE_INDEXER_URI overrides regardless of NODE_ENV', () => {
  // 1. Unsafe override with NODE_ENV unset
  const envNoNodeEnv = { ...process.env };
  delete envNoNodeEnv.NODE_ENV;
  envNoNodeEnv.VITE_INDEXER_URI = 'https://midnight-preprod.blockfrost.io/api/v0?project_id=secret123';

  const failRes1 = spawnSync('node', ['scripts/prebuild-check.mjs'], {
    env: envNoNodeEnv,
    encoding: 'utf8',
  });

  assert.notEqual(failRes1.status, 0, 'Build must fail when VITE_INDEXER_URI is set, even if NODE_ENV is unset');
  assert.match(failRes1.stderr, /PRE-BUILD SECURITY ERROR/);

  // 2. Placeholder rejection (must NOT be exempted)
  const envPlaceholder = { ...process.env };
  delete envPlaceholder.NODE_ENV;
  envPlaceholder.VITE_INDEXER_URI = 'https://midnight-preprod.blockfrost.io/api/v0?project_id=YOUR_PROJECT_ID';

  const failRes2 = spawnSync('node', ['scripts/prebuild-check.mjs'], {
    env: envPlaceholder,
    encoding: 'utf8',
  });

  assert.notEqual(failRes2.status, 0, 'Build must reject placeholder values too');
  assert.match(failRes2.stderr, /PRE-BUILD SECURITY ERROR/);

  // 3. Rejection from .env.local file
  const testEnvLocal = '.env.local.test';
  writeFileSync('.env.local', 'VITE_INDEXER_URI=https://midnight-preprod.blockfrost.io/api/v0?project_id=any\n');
  try {
    const cleanEnv = { ...process.env };
    delete cleanEnv.NODE_ENV;
    delete cleanEnv.VITE_INDEXER_URI;
    delete cleanEnv.VITE_INDEXER_WS_URI;

    const failResFile = spawnSync('node', ['scripts/prebuild-check.mjs'], {
      env: cleanEnv,
      encoding: 'utf8',
    });

    assert.notEqual(failResFile.status, 0, 'Build must reject overrides in .env.local');
    assert.match(failResFile.stderr, /PRE-BUILD SECURITY ERROR.*\.env\.local/);
  } finally {
    if (existsSync('.env.local')) {
      unlinkSync('.env.local');
    }
  }

  // 4. Safe environment (no overrides) must exit 0
  const passEnv = { ...process.env };
  delete passEnv.VITE_INDEXER_URI;
  delete passEnv.VITE_INDEXER_WS_URI;

  const passRes = spawnSync('node', ['scripts/prebuild-check.mjs'], {
    env: passEnv,
    encoding: 'utf8',
  });

  assert.equal(passRes.status, 0, 'Build must pass when no overrides are present');
  assert.match(passRes.stdout, /PASS pre-build security check/);
});
