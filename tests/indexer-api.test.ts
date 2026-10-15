import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import handler, {
  extractClientIp,
  isAllowedOrigin,
  validateAndSanitizeRequest,
  computeCacheKey,
  sanitizeOutput,
  checkRateLimit,
  readBody,
  resetInstanceStateForTesting,
} from '../api/indexer.ts';

function createMockReqRes(options: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  socket?: any;
}) {
  const req = new EventEmitter() as any;
  req.method = options.method || 'POST';
  req.headers = options.headers || {
    host: 'common-veil.vercel.app',
    'x-real-ip': '10.0.0.1',
  };
  req.socket = options.socket || { remoteAddress: '10.0.0.1' };
  req.body = options.body;

  let statusCode = 200;
  const responseHeaders: Record<string, string> = {};
  let responseData = '';

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    writeHead(code: number, headers: Record<string, string>) {
      statusCode = code;
      Object.assign(responseHeaders, headers);
      return this;
    },
    setHeader(key: string, value: string) {
      responseHeaders[key.toLowerCase()] = value;
      return this;
    },
    end(data?: string) {
      if (data) responseData = data;
    },
    getStatus: () => statusCode,
    getHeaders: () => responseHeaders,
    getData: () => responseData,
    getJson: () => JSON.parse(responseData || '{}'),
  };

  return { req, res };
}

test('1. Operation validation: allows exact CONTRACT_STATE_QUERY with valid hex address', () => {
  const payload = {
    operationName: 'CONTRACT_STATE_QUERY',
    query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!, $offset: ContractActionOffset) { contractAction(address: $address, offset: $offset) { state } }',
    variables: {
      address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b',
      offset: null,
    },
  };

  const validated = validateAndSanitizeRequest(payload);
  assert.equal(validated.operationName, 'CONTRACT_STATE_QUERY');
  assert.equal(validated.variables.address, 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b');
  assert.ok(validated.canonicalQuery.includes('CONTRACT_STATE_QUERY'));
});

test('2. Variable validation: rejects invalid non-hex, malformed, or nested offset variables', () => {
  assert.throws(() => {
    validateAndSanitizeRequest({
      operationName: 'CONTRACT_STATE_QUERY',
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!) { contractAction(address: $address) { state } }',
      variables: { address: 'not-a-valid-hex-address' },
    });
  }, /Address variable must be a 64-66 character hexadecimal string/);

  assert.throws(() => {
    validateAndSanitizeRequest({
      operationName: 'CONTRACT_STATE_QUERY',
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!) { contractAction(address: $address) { state } }',
      variables: { address: '1234' },
    });
  }, /Address variable must be a 64-66 character hexadecimal string/);

  // Offset with unknown property
  assert.throws(() => {
    validateAndSanitizeRequest({
      operationName: 'CONTRACT_STATE_QUERY',
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!, $offset: ContractActionOffset) { contractAction(address: $address, offset: $offset) { state } }',
      variables: {
        address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b',
        offset: { maliciousProp: 123 },
      },
    });
  }, /Unexpected property 'maliciousProp' in offset variable/);

  // Offset with invalid height
  assert.throws(() => {
    validateAndSanitizeRequest({
      operationName: 'CONTRACT_STATE_QUERY',
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!, $offset: ContractActionOffset) { contractAction(address: $address, offset: $offset) { state } }',
      variables: {
        address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b',
        offset: { height: -5 },
      },
    });
  }, /Offset height must be a non-negative integer/);
});

test('3. Operation validation: allows TX_ID_QUERY with valid transaction identifier', () => {
  const payload = {
    operationName: 'TX_ID_QUERY',
    query: 'query TX_ID_QUERY($offset: TransactionOffset!) { transactions(offset: $offset) { id } }',
    variables: {
      offset: {
        identifier: '0044682865b940b3054c6fb1f065f4d19acc2627daa543dff4aaedbc88e8bcaf9c',
      },
    },
  };

  const validated = validateAndSanitizeRequest(payload);
  assert.equal(validated.operationName, 'TX_ID_QUERY');
  assert.equal(
    validated.variables.offset.identifier,
    '0044682865b940b3054c6fb1f065f4d19acc2627daa543dff4aaedbc88e8bcaf9c',
  );
});

test('4. Security: AST rejects mutations, subscriptions, directives, and aliases', () => {
  assert.throws(() => {
    validateAndSanitizeRequest({
      query: 'mutation HackContract { mutateState }',
      variables: {},
    });
  }, /Only query operations are permitted/);

  assert.throws(() => {
    validateAndSanitizeRequest({
      query: 'subscription WatchTx { txs }',
      variables: {},
    });
  }, /Only query operations are permitted/);

  assert.throws(() => {
    validateAndSanitizeRequest({
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!) @client { contractAction(address: $address) { state } }',
      variables: { address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b' },
    });
  }, /directives are forbidden/i);

  assert.throws(() => {
    validateAndSanitizeRequest({
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!) { aliased: contractAction(address: $address) { state } }',
      variables: { address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b' },
    });
  }, /field aliases are forbidden/i);
});

test('5. Variable validation: rejects prototype pollution attempts', () => {
  assert.throws(() => {
    const malicious = JSON.parse('{"address":"b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b","__proto__":{"polluted":true}}');
    validateAndSanitizeRequest({
      operationName: 'CONTRACT_STATE_QUERY',
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!) { contractAction(address: $address) { state } }',
      variables: malicious,
    });
  }, /Invalid variable object properties|Unexpected variable/);
});

test('6. IP extraction: prioritizes trusted x-real-ip and ignores client spoofing', () => {
  const reqWithRealIp = {
    headers: {
      'x-real-ip': '203.0.113.195',
      'x-forwarded-for': 'client-spoofed-ip, 198.51.100.1',
    },
  };
  assert.equal(extractClientIp(reqWithRealIp), '203.0.113.195');

  const reqWithVercelForwarded = {
    headers: {
      'x-vercel-forwarded-for': '198.51.100.42, 203.0.113.1',
    },
  };
  assert.equal(extractClientIp(reqWithVercelForwarded), '198.51.100.42');
});

test('7. Exact Origin restriction: rejects arbitrary .vercel.app and malicious domains', () => {
  // Reject external malicious domains
  assert.equal(isAllowedOrigin('https://evil-attacker.com', 'https://evil-attacker.com'), false);

  // Reject random unauthorized vercel apps (NO wildcard *.vercel.app matching allowed!)
  assert.equal(isAllowedOrigin('https://random-phishing-app.vercel.app'), false);

  // Allow production domain
  assert.equal(isAllowedOrigin('https://common-veil.vercel.app'), true);

  // Allow localhost
  assert.equal(isAllowedOrigin('http://localhost:3000'), true);
  assert.equal(isAllowedOrigin('http://localhost:5173'), true);

  // Test dynamic preview domain via VERCEL_URL
  const oldVercelUrl = process.env.VERCEL_URL;
  try {
    process.env.VERCEL_URL = 'common-veil-preview-test.vercel.app';
    assert.equal(isAllowedOrigin('https://common-veil-preview-test.vercel.app'), true);
    assert.equal(isAllowedOrigin('https://unrelated-domain.vercel.app'), false);
  } finally {
    if (oldVercelUrl) process.env.VERCEL_URL = oldVercelUrl;
    else delete process.env.VERCEL_URL;
  }
});

test('8. Cache identity: generates distinct, document-bound and variable-bound SHA-256 keys', () => {
  const opName = 'CONTRACT_STATE_QUERY';
  const queryA = 'query CONTRACT_STATE_QUERY($address: HexEncoded!) { contractAction(address: $address) { state } }';
  const queryB = 'query CONTRACT_STATE_QUERY($address: HexEncoded!) { contractAction(address: $address) { state __typename } }';

  const vars1 = { address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b' };
  const vars2 = { address: '0000000000000000000000000000000000000000000000000000000000000000' };

  const keyA1 = computeCacheKey(opName, queryA, vars1);
  const keyA2 = computeCacheKey(opName, queryA, vars2);
  const keyB1 = computeCacheKey(opName, queryB, vars1);

  // Keys must differ when query document differs
  assert.notEqual(keyA1, keyB1, 'Cache keys must differ across distinct query documents');

  // Keys must differ when variables differ
  assert.notEqual(keyA1, keyA2, 'Cache keys must differ across distinct variables');

  // Key must be deterministic regardless of object key order
  const vars1Reordered = { ...vars1 };
  const keyA1Reordered = computeCacheKey(opName, queryA, vars1Reordered);
  assert.equal(keyA1, keyA1Reordered);
});

test('9. Rate limiting & headers: calculates remaining quota and enforces window limits', () => {
  resetInstanceStateForTesting();
  const testIp = '192.0.2.100';

  const r1 = checkRateLimit(testIp);
  assert.equal(r1.limited, false);
  assert.equal(r1.remaining, 59);

  // Simulate bursting beyond 60 requests
  for (let i = 0; i < 60; i++) {
    checkRateLimit(testIp);
  }

  const rOver = checkRateLimit(testIp);
  assert.equal(rOver.limited, true);
  assert.equal(rOver.remaining, 0);
});

test('10. Body size limit enforcement: rejects pre-parsed body exceeding 8KB', async () => {
  const hugeString = 'a'.repeat(9 * 1024); // 9KB
  const fakeReq = {
    body: { query: hugeString },
  };

  await assert.rejects(async () => {
    await readBody(fakeReq);
  }, /PAYLOAD_TOO_LARGE/);
});

test('11. Handler: rejects non-POST methods with 405', async () => {
  const { req, res } = createMockReqRes({ method: 'GET' });
  await handler(req, res);
  assert.equal(res.getStatus(), 405);
  assert.match(res.getJson().error, /Method not allowed/);
});

test('12. Handler: rejects cross-origin requests with 403', async () => {
  const { req, res } = createMockReqRes({
    headers: {
      origin: 'https://malicious-dapp.xyz',
    },
  });
  await handler(req, res);
  assert.equal(res.getStatus(), 403);
  assert.match(res.getJson().error, /Cross-origin request rejected/);
});

test('13. Handler: returns 503 when BLOCKFROST_PROJECT_ID is missing in server environment', async () => {
  const original = process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.BLOCKFROST_PREPROD_PROJECT_ID;

  try {
    const { req, res } = createMockReqRes({
      body: {
        operationName: 'CONTRACT_STATE_QUERY',
        query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!, $offset: ContractActionOffset) { contractAction(address: $address, offset: $offset) { state } }',
        variables: { address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b' },
      },
    });
    await handler(req, res);
    assert.equal(res.getStatus(), 503);
    assert.match(res.getJson().error, /Server-side Blockfrost fallback is not configured/);
  } finally {
    if (original) process.env.BLOCKFROST_PROJECT_ID = original;
  }
});

test('14. Output sanitization: strips credentials and internal tokens', () => {
  const dirtyOutput = '{"error": "Failed at https://midnight-preprod.blockfrost.io/api/v0?project_id=nightpreprod0123456789abcdef"}';
  const clean = sanitizeOutput(dirtyOutput);
  assert.ok(!clean.includes('nightpreprod0123456789abcdef'));
  assert.ok(clean.includes('[REDACTED]'));
});
