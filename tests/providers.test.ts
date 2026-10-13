import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveIndexerEndpoints,
  validateBlockfrostOverride,
  sanitizeTokens,
  IndexerConfigurationError,
} from '../src/providers.ts';

const SAMPLE_PROJECT_ID = 'preprod0123456789abcdef0123456789abcdef';
const VALID_HTTP_URL = `https://midnight-preprod.blockfrost.io/api/v0?project_id=${SAMPLE_PROJECT_ID}`;
const VALID_WS_URL = `wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=${SAMPLE_PROJECT_ID}`;

const WALLET_CONFIG = {
  indexerUri: 'https://indexer.preprod.midnight.network/api/v1/graphql',
  indexerWsUri: 'wss://indexer.preprod.midnight.network/api/v1/graphql/ws',
};

// 1. Valid Blockfrost HTTP and WebSocket pair
test('1. Valid Blockfrost HTTP and WebSocket pair resolves to Blockfrost override', () => {
  const result = resolveIndexerEndpoints(VALID_HTTP_URL, VALID_WS_URL, WALLET_CONFIG);

  assert.equal(result.httpUri, VALID_HTTP_URL);
  assert.equal(result.wsUri, VALID_WS_URL);
  assert.equal(result.status, 'Blockfrost override configured');
});

// 2. Fallback to wallet configuration when env overrides are absent or empty
test('2. Fallback to wallet configuration when env overrides are absent or empty', () => {
  // Both undefined
  const fallbackUndefined = resolveIndexerEndpoints(undefined, undefined, WALLET_CONFIG);
  assert.equal(fallbackUndefined.httpUri, WALLET_CONFIG.indexerUri);
  assert.equal(fallbackUndefined.wsUri, WALLET_CONFIG.indexerWsUri);
  assert.equal(fallbackUndefined.status, 'Wallet-provided indexer');

  // Both empty strings or whitespace
  const fallbackEmpty = resolveIndexerEndpoints('', '   ', WALLET_CONFIG);
  assert.equal(fallbackEmpty.httpUri, WALLET_CONFIG.indexerUri);
  assert.equal(fallbackEmpty.wsUri, WALLET_CONFIG.indexerWsUri);
  assert.equal(fallbackEmpty.status, 'Wallet-provided indexer');
});

// 3. Incomplete pair rejection
test('3. Incomplete pair rejection when only one URL is provided', () => {
  // HTTP provided, WS missing
  assert.throws(
    () => resolveIndexerEndpoints(VALID_HTTP_URL, undefined, WALLET_CONFIG),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /Incomplete Blockfrost override configuration/);
      return true;
    },
  );

  // WS provided, HTTP missing
  assert.throws(
    () => resolveIndexerEndpoints('', VALID_WS_URL, WALLET_CONFIG),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /Incomplete Blockfrost override configuration/);
      return true;
    },
  );
});

// 4. Placeholder rejection
test('4. Placeholder rejection for YOUR_PROJECT_ID and YOUR_MIDNIGHT_PREPROD_PROJECT_ID', () => {
  const placeholderHttp = 'https://midnight-preprod.blockfrost.io/api/v0?project_id=YOUR_MIDNIGHT_PREPROD_PROJECT_ID';
  const placeholderWs = 'wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=YOUR_MIDNIGHT_PREPROD_PROJECT_ID';

  assert.throws(
    () => validateBlockfrostOverride(placeholderHttp, placeholderWs),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /placeholder YOUR_PROJECT_ID detected/);
      return true;
    },
  );

  const genericPlaceholderHttp = 'https://midnight-preprod.blockfrost.io/api/v0?project_id=YOUR_PROJECT_ID';
  const genericPlaceholderWs = 'wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=YOUR_PROJECT_ID';

  assert.throws(
    () => validateBlockfrostOverride(genericPlaceholderHttp, genericPlaceholderWs),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /placeholder YOUR_PROJECT_ID detected/);
      return true;
    },
  );
});

// 5. Unsafe protocol rejection (http instead of https, ws instead of wss)
test('5. Unsafe protocol rejection (http instead of https, ws instead of wss)', () => {
  const insecureHttp = `http://midnight-preprod.blockfrost.io/api/v0?project_id=${SAMPLE_PROJECT_ID}`;
  const insecureWs = `ws://midnight-preprod.blockfrost.io/api/v0/ws?project_id=${SAMPLE_PROJECT_ID}`;

  // Insecure HTTP protocol
  assert.throws(
    () => validateBlockfrostOverride(insecureHttp, VALID_WS_URL),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /HTTPS is strictly required/);
      return true;
    },
  );

  // Insecure WS protocol
  assert.throws(
    () => validateBlockfrostOverride(VALID_HTTP_URL, insecureWs),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /WSS is strictly required/);
      return true;
    },
  );
});

// 6. Non-Blockfrost host rejection and malformed URLs
test('6. Rejects non-Blockfrost host and malformed URLs', () => {
  // Non-Blockfrost host
  const maliciousHttp = `https://attacker.example.com/api/v0?project_id=${SAMPLE_PROJECT_ID}`;
  assert.throws(
    () => validateBlockfrostOverride(maliciousHttp, VALID_WS_URL),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /invalid host/);
      return true;
    },
  );

  // Malformed URL
  assert.throws(
    () => validateBlockfrostOverride('not-a-valid-url', VALID_WS_URL),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /malformed VITE_INDEXER_URI/);
      return true;
    },
  );

  assert.throws(
    () => validateBlockfrostOverride(VALID_HTTP_URL, 'not-a-valid-ws'),
    (err: any) => {
      assert.equal(err instanceof IndexerConfigurationError, true);
      assert.match(err.message, /malformed VITE_INDEXER_WS_URI/);
      return true;
    },
  );
});

// 7. Token redaction from error messages, logs, and exceptions
test('7. Token redaction from error messages, exceptions and URLs', () => {
  const secretToken = 'preprod999888777666555444333222111000aa';
  const urlWithToken = `https://midnight-preprod.blockfrost.io/api/v0?project_id=${secretToken}&format=json`;

  const redacted = sanitizeTokens(urlWithToken);
  assert.equal(redacted.includes(secretToken), false, 'Secret token must not appear in sanitized string');
  assert.match(redacted, /project_id=\[REDACTED\]/);

  // Test error creation with sensitive message
  const sensitiveError = new IndexerConfigurationError(`Failed to connect with token ${secretToken} at ${urlWithToken}`);
  assert.equal(sensitiveError.message.includes(secretToken), false, 'Error message must not contain raw token');
  assert.match(sensitiveError.message, /\[REDACTED\]/);

  // Test midnightpreprod token format redaction
  const customMidnightToken = 'midnightpreprod0123456789abcdef0123';
  const customRedacted = sanitizeTokens(`Error contacting indexer at project_id=${customMidnightToken}`);
  assert.equal(customRedacted.includes(customMidnightToken), false);
  assert.match(customRedacted, /project_id=\[REDACTED\]/);
});

// 8. No real Blockfrost project token committed to repository fixtures or files
test('8. No real Blockfrost project token committed to repository fixtures or tracked files', () => {
  // Scan all tracked/text files in the repository for real blockfrost project id patterns
  const rootDir = process.cwd();
  const suspiciousTokenPattern = /\b(preprod|mainnet|preview)[a-zA-Z0-9]{32,}\b/g;

  function scanDir(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === '.git' || entry === 'node_modules' || entry === 'dist' || entry === '.vite') {
        continue;
      }
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile() && !entry.endsWith('.wasm')) {
        const content = readFileSync(fullPath, 'utf8');
        const matches = content.match(suspiciousTokenPattern);
        if (matches) {
          // If a match is found, verify it is only the test double fixture in this test file
          for (const match of matches) {
            const isTestFixture = fullPath.endsWith('providers.test.ts') &&
              (match === SAMPLE_PROJECT_ID || match === 'preprod999888777666555444333222111000aa');
            assert.equal(
              isTestFixture,
              true,
              `Found unexpected token-like string in ${fullPath}: ${match}`,
            );
          }
        }
      }
    }
  }

  scanDir(rootDir);
});
