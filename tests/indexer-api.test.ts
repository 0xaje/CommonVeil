import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import handler, { validateGraphQLQuery } from '../api/indexer.ts';

function createMockReqRes(options: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  socket?: any;
}) {
  const req = new EventEmitter() as any;
  req.method = options.method || 'POST';
  req.headers = options.headers || {};
  req.socket = options.socket || { remoteAddress: '127.0.0.1' };
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

test('validateGraphQLQuery allows standard Midnight queries and blocks mutations', () => {
  assert.equal(validateGraphQLQuery('query CONTRACT_STATE_QUERY { contractAction { state } }'), true);
  assert.equal(validateGraphQLQuery('{ contractAction { state } }'), true);
  assert.equal(validateGraphQLQuery('query { __typename }'), true);

  // Rejects empty / non-string
  assert.equal(validateGraphQLQuery(''), false);
  assert.equal(validateGraphQLQuery(null), false);

  // Rejects mutations and subscriptions
  assert.equal(validateGraphQLQuery('mutation DropTable { drop }'), false);
  assert.equal(validateGraphQLQuery('subscription TX_SUB { tx }'), false);

  // Rejects non-Midnight random operations
  assert.equal(validateGraphQLQuery('query ArbitraryQuery { users { name } }'), false);
});

test('handler rejects GET / PUT / DELETE with 405 Method Not Allowed', async () => {
  const { req, res } = createMockReqRes({ method: 'GET' });
  await handler(req, res);
  assert.equal(res.getStatus(), 405);
  assert.match(res.getJson().error, /Method not allowed/);
});

test('handler returns 503 when BLOCKFROST_PROJECT_ID is not configured', async () => {
  const original = process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.BLOCKFROST_PROJECT_ID;
  delete process.env.BLOCKFROST_PREPROD_PROJECT_ID;

  try {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { query: 'query CONTRACT_STATE_QUERY { contractAction { state } }' },
    });
    await handler(req, res);
    assert.equal(res.getStatus(), 503);
    assert.match(res.getJson().error, /not configured/);
  } finally {
    if (original) process.env.BLOCKFROST_PROJECT_ID = original;
  }
});

test('handler rejects invalid or disallowed queries with 400', async () => {
  process.env.BLOCKFROST_PROJECT_ID = 'test_token';
  try {
    const { req, res } = createMockReqRes({
      method: 'POST',
      body: { query: 'mutation Hack { doSomething }' },
    });
    await handler(req, res);
    assert.equal(res.getStatus(), 400);
    assert.match(res.getJson().error, /Invalid GraphQL query/);
  } finally {
    delete process.env.BLOCKFROST_PROJECT_ID;
  }
});
