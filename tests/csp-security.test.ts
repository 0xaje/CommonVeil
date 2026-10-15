import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('Vercel CSP and security headers configuration', () => {
  assert.equal(existsSync('vercel.json'), true, 'vercel.json must exist');
  const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8'));

  assert.ok(vercelConfig.headers, 'Headers array must be configured');
  const globalHeaderGroup = vercelConfig.headers.find((h: any) => h.source === '/(.*)');
  assert.ok(globalHeaderGroup, 'Global headers must be defined for /(.*)');

  const headerMap = new Map<string, string>(
    globalHeaderGroup.headers.map((h: any) => [String(h.key).toLowerCase(), String(h.value)])
  );

  // 1. Mandatory security headers
  assert.equal(headerMap.get('x-content-type-options'), 'nosniff');
  assert.equal(headerMap.get('x-frame-options'), 'DENY');
  assert.equal(headerMap.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(headerMap.get('strict-transport-security') ?? '', /max-age=31536000/);

  // 2. CSP analysis
  const csp = headerMap.get('content-security-policy') ?? '';
  assert.ok(csp.length > 0, 'Content-Security-Policy must be set');

  // Must allow wasm-unsafe-eval for client-side WASM crypto/circuits
  assert.match(csp, /script-src[^;]*'wasm-unsafe-eval'/, 'CSP must allow wasm-unsafe-eval for Midnight WASM');

  // Must disallow inline scripts for security
  assert.ok(!csp.includes("'unsafe-inline'") || csp.includes("style-src 'self' 'unsafe-inline'"), 'CSP must not allow unsafe-inline in script-src');

  // Must allow connections to Midnight preprod indexers & local proof server
  assert.match(csp, /connect-src[^;]*https:\/\/midnight-preprod\.blockfrost\.io/, 'connect-src must permit Blockfrost HTTPS');
  assert.match(csp, /connect-src[^;]*wss:\/\/midnight-preprod\.blockfrost\.io/, 'connect-src must permit Blockfrost WSS');
  assert.match(csp, /connect-src[^;]*https:\/\/\*\.midnight\.network/, 'connect-src must permit Midnight network HTTPS');
  assert.match(csp, /connect-src[^;]*wss:\/\/\*\.midnight\.network/, 'connect-src must permit Midnight network WSS');
  assert.match(csp, /connect-src[^;]*http:\/\/localhost:6300/, 'connect-src must permit local proof server');

  // 3. Static asset headers for WASM, keys, and ZKIR
  const wasmHeader = vercelConfig.headers.find((h: any) => h.source.includes('wasm'));
  assert.ok(wasmHeader, 'WASM MIME type header must be configured');
  const wasmType = wasmHeader.headers.find((h: any) => h.key === 'Content-Type')?.value;
  assert.equal(wasmType, 'application/wasm');

  const keysHeader = vercelConfig.headers.find((h: any) => h.source.includes('keys'));
  assert.ok(keysHeader, 'Keys header must be configured');
  const keysType = keysHeader.headers.find((h: any) => h.key === 'Content-Type')?.value;
  assert.equal(keysType, 'application/octet-stream');
  const keysCache = String(keysHeader.headers.find((h: any) => h.key === 'Cache-Control')?.value ?? '');
  assert.match(keysCache, /must-revalidate/, 'Keys must not be cached immutably without revalidation');

  const zkirHeader = vercelConfig.headers.find((h: any) => h.source.includes('zkir'));
  assert.ok(zkirHeader, 'ZKIR header must be configured');
  const zkirType = zkirHeader.headers.find((h: any) => h.key === 'Content-Type')?.value;
  assert.equal(zkirType, 'application/octet-stream');
  const zkirCache = String(zkirHeader.headers.find((h: any) => h.key === 'Cache-Control')?.value ?? '');
  assert.match(zkirCache, /must-revalidate/, 'ZKIR must not be cached immutably without revalidation');
});
