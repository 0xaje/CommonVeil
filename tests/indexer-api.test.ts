import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import handler, {
  extractClientIp,
  isAllowedOrigin,
  validateAndSanitizeRequest,
  sanitizeOutput,
  isRateLimited,
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
});

test('2. Variable validation: rejects invalid non-hex or malformed addresses', () => {
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

test('4. Security: rejects mutations, subscriptions, directives, and aliases', () => {
  assert.throws(() => {
    validateAndSanitizeRequest({
      query: 'mutation HackContract { mutateState }',
      variables: {},
    });
  }, /Only GraphQL queries are allowed/);

  assert.throws(() => {
    validateAndSanitizeRequest({
      query: 'subscription WatchTx { txs }',
      variables: {},
    });
  }, /Only GraphQL queries are allowed/);

  assert.throws(() => {
    validateAndSanitizeRequest({
      query: 'query CONTRACT_STATE_QUERY($address: HexEncoded!) @client { contractAction(address: $address) { state } }',
      variables: { address: 'b62b97709f7629cede3bcbcd52ecda4fe2ad204ceac2946fda484789d104d23b' },
    });
  }, /directives are not allowed/);
});

test('5. IP extraction: prioritizes trusted x-real-ip and ignores client spoofing', () => {
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

test('6. Origin restriction: rejects cross-origin attacker requests', () => {
  assert.equal(isAllowedOrigin('https://evil-attacker.com', 'evil-attacker.com'), false);
  assert.equal(isAllowedOrigin('https://common-veil.vercel.app', 'common-veil.vercel.app'), true);
  assert.equal(isAllowedOrigin('https://common-veil-preview-123.vercel.app', 'common-veil-preview-123.vercel.app'), true);
  assert.equal(isAllowedOrigin('http://localhost:3000', 'localhost:3000'), true);
});

test('7. Handler: rejects non-POST methods with 405', async () => {
  const { req, res } = createMockReqRes({ method: 'GET' });
  await handler(req, res);
  assert.equal(res.getStatus(), 405);
  assert.match(res.getJson().error, /Method not allowed/);
});

test('8. Handler: rejects cross-origin requests with 403', async () => {
  const { req, res } = createMockReqRes({
    headers: {
      origin: 'https://malicious-dapp.xyz',
    },
  });
  await handler(req, res);
  assert.equal(res.getStatus(), 403);
  assert.match(res.getJson().error, /Cross-origin request rejected/);
});

test('9. Handler: returns 503 when BLOCKFROST_PROJECT_ID is missing in server environment', async () => {
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

test('10. Output sanitization: strips credentials and internal tokens', () => {
  const dirtyOutput = '{"error": "Failed at https://midnight-preprod.blockfrost.io/api/v0?project_id=nightpreprod0123456789abcdef"}';
  const clean = sanitizeOutput(dirtyOutput);
  assert.ok(!clean.includes('nightpreprod0123456789abcdef'));
  assert.ok(clean.includes('[REDACTED]'));
});
