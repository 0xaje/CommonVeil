import type { IncomingMessage, ServerResponse } from 'node:http';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;
const MAX_BODY_BYTES = 100 * 1024; // 100KB

const ipRequestMap = new Map<string, { count: number; windowStart: number }>();

function cleanupRateLimits(now: number) {
  if (ipRequestMap.size > 10_000) {
    for (const [ip, entry] of ipRequestMap.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        ipRequestMap.delete(ip);
      }
    }
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  cleanupRateLimits(now);
  const entry = ipRequestMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequestMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

const ALLOWED_QUERY_PATTERNS = [
  'CONTRACT_STATE_QUERY',
  'CONTRACT_AND_ZSWAP_STATE_QUERY',
  'DEPLOY_CONTRACT_STATE_TX_QUERY',
  'DEPLOY_TX_QUERY',
  'TX_ID_QUERY',
  'BLOCK_HASH_QUERY',
  'LATEST_CONTRACT_TX_BLOCK_HEIGHT_QUERY',
  'BOTH_STATE_QUERY',
  'UNSHIELDED_BALANCE_QUERY',
  'QUERY_UNSHIELDED_BALANCES_WITH_OFFSET',
  'contractAction',
  'transactions',
  'block',
  '__typename',
];

export function validateGraphQLQuery(query: unknown): boolean {
  if (typeof query !== 'string') return false;
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 8192) return false;
  if (!trimmed.startsWith('query') && !trimmed.startsWith('{')) return false;
  // Disallow GraphQL mutations or subscriptions on this read endpoint
  if (/\b(mutation|subscription)\b/i.test(trimmed)) return false;
  return ALLOWED_QUERY_PATTERNS.some((pattern) => trimmed.includes(pattern));
}

async function readBody(req: any): Promise<string> {
  if (req.body) {
    if (typeof req.body === 'string') return req.body;
    if (typeof req.body === 'object') return JSON.stringify(req.body);
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  }

  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk: Buffer | string) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendResponse(res: any, status: number, data: unknown) {
  const payload = JSON.stringify(data);
  if (typeof res.status === 'function') {
    res.status(status).setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(payload);
  } else {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(payload);
  }
}

export default async function handler(req: any, res: any) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    sendResponse(res, 405, { error: 'Method not allowed. GraphQL indexer endpoint accepts POST only.' });
    return;
  }

  // 2. Client IP rate limiting
  const forwardedFor = req.headers['x-forwarded-for'];
  const clientIp = typeof forwardedFor === 'string'
    ? forwardedFor.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';

  if (checkRateLimit(clientIp)) {
    sendResponse(res, 429, { error: 'Rate limit exceeded. Please retry after a brief delay.' });
    return;
  }

  // 3. Payload reading and size enforcement
  let rawBody: string;
  try {
    rawBody = await readBody(req);
  } catch (err: any) {
    if (err.message === 'PAYLOAD_TOO_LARGE') {
      sendResponse(res, 413, { error: 'Payload too large. Maximum GraphQL request size is 100KB.' });
      return;
    }
    sendResponse(res, 400, { error: 'Failed to read request body.' });
    return;
  }

  // 4. JSON parsing and GraphQL query validation
  let parsed: any;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    sendResponse(res, 400, { error: 'Malformed JSON payload.' });
    return;
  }

  if (!parsed || !validateGraphQLQuery(parsed.query)) {
    sendResponse(res, 400, { error: 'Invalid GraphQL query: only Midnight indexer read queries are permitted.' });
    return;
  }

  // 5. Server-side Blockfrost Preprod credential injection
  const projectId = process.env.BLOCKFROST_PROJECT_ID || process.env.BLOCKFROST_PREPROD_PROJECT_ID;
  if (!projectId || projectId.trim().length === 0) {
    sendResponse(res, 503, {
      error: 'Server-side Blockfrost fallback is not configured on this host. Set BLOCKFROST_PROJECT_ID.',
    });
    return;
  }

  const targetUrl = `https://midnight-preprod.blockfrost.io/api/v0?project_id=${encodeURIComponent(projectId.trim())}`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: parsed.query,
        variables: parsed.variables ?? null,
      }),
    });

    const responseData = await upstreamRes.json();

    // 6. Return sanitized upstream response (no server tokens or internal URLs leaked)
    sendResponse(res, upstreamRes.status, responseData);
  } catch (upstreamError: any) {
    sendResponse(res, 502, {
      error: 'Upstream Midnight indexer gateway error.',
    });
  }
}
