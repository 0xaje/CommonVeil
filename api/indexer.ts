import type { IncomingMessage, ServerResponse } from 'node:http';

// Security & Resource Constraints
const MAX_BODY_BYTES = 8 * 1024; // 8KB (Midnight queries are ~500-1500 bytes)
const UPSTREAM_TIMEOUT_MS = 8_000; // 8 seconds
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/minute per client IP
const CACHE_TTL_MS = 5_000; // 5 seconds LRU cache for identical read queries

// In-memory rate limiting and caching maps
const ipRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const queryCache = new Map<string, { expiresAt: number; status: number; body: string }>();

function cleanupMemory(now: number) {
  if (ipRateLimitMap.size > 5_000) {
    for (const [ip, entry] of ipRateLimitMap.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        ipRateLimitMap.delete(ip);
      }
    }
  }
  if (queryCache.size > 500) {
    for (const [key, entry] of queryCache.entries()) {
      if (now > entry.expiresAt) {
        queryCache.delete(key);
      }
    }
  }
}

/**
 * Extracts the trusted client IP.
 * Prioritizes Vercel-set trusted headers ('x-real-ip', 'x-vercel-forwarded-for')
 * and never relies on arbitrary untrusted client-supplied forwarded headers.
 */
export function extractClientIp(req: any): string {
  const vercelRealIp = req.headers?.['x-real-ip'];
  if (typeof vercelRealIp === 'string' && vercelRealIp.trim().length > 0) {
    return vercelRealIp.trim();
  }

  const vercelForwarded = req.headers?.['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.trim().length > 0) {
    return vercelForwarded.split(',')[0].trim();
  }

  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    const parts = forwarded.split(',').map((p: string) => p.trim());
    return parts[parts.length - 1] || 'unknown';
  }

  return req.socket?.remoteAddress || 'unknown';
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  cleanupMemory(now);
  const entry = ipRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

/**
 * Checks Origin / Referer against allowed deployment domains.
 */
export function isAllowedOrigin(originHeader: unknown, hostHeader: unknown): boolean {
  if (!originHeader && !hostHeader) return true; // Direct same-host or internal invocations
  const origin = String(originHeader || hostHeader).toLowerCase();

  // Allowed origins: self origin, vercel preview & production domains, localhost
  return (
    origin.includes('common-veil.vercel.app') ||
    origin.includes('.vercel.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  );
}

// Exactly allowed GraphQL operation names genuinely used by CommonVeil
export type AllowedOperationName =
  | 'CONTRACT_STATE_QUERY'
  | 'DEPLOY_CONTRACT_STATE_TX_QUERY'
  | 'DEPLOY_TX_QUERY'
  | 'TX_ID_QUERY'
  | 'IntrospectionQuery';

export interface ValidatedGraphQLRequest {
  readonly operationName: AllowedOperationName;
  readonly query: string;
  readonly variables: Record<string, any>;
}

const HEX_ADDRESS_REGEX = /^[0-9a-fA-F]{64,66}$/;
const HEX_TXID_REGEX = /^[0-9a-fA-F]{64,72}$/;

/**
 * Strict AST/Shape and variable validator for GraphQL indexer queries.
 * Rejects mutations, subscriptions, aliases, directives, or unauthorized operations.
 */
export function validateAndSanitizeRequest(payload: any): ValidatedGraphQLRequest {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a single GraphQL JSON object');
  }

  const { query, operationName, variables } = payload;
  if (typeof query !== 'string') {
    throw new Error('Query string is required');
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0 || trimmedQuery.length > 4096) {
    throw new Error('Query length out of allowed bounds (1 - 4096 characters)');
  }

  // Reject GraphQL mutations, subscriptions, directives, or aliases
  if (/\b(mutation|subscription)\b/i.test(trimmedQuery)) {
    throw new Error('Only GraphQL queries are allowed');
  }
  if (/@\w+/.test(trimmedQuery)) {
    throw new Error('GraphQL directives are not allowed');
  }

  // Check nesting depth (max 8 levels)
  const openBraces = (trimmedQuery.match(/\{/g) || []).length;
  const closeBraces = (trimmedQuery.match(/\}/g) || []).length;
  if (openBraces !== closeBraces || openBraces > 8) {
    throw new Error('Query structural depth or brace balancing violates security policy');
  }

  // Determine allowed operation
  let resolvedOp: AllowedOperationName;
  if (operationName === 'CONTRACT_STATE_QUERY' || trimmedQuery.includes('CONTRACT_STATE_QUERY')) {
    resolvedOp = 'CONTRACT_STATE_QUERY';
  } else if (operationName === 'DEPLOY_CONTRACT_STATE_TX_QUERY' || trimmedQuery.includes('DEPLOY_CONTRACT_STATE_TX_QUERY')) {
    resolvedOp = 'DEPLOY_CONTRACT_STATE_TX_QUERY';
  } else if (operationName === 'DEPLOY_TX_QUERY' || trimmedQuery.includes('DEPLOY_TX_QUERY')) {
    resolvedOp = 'DEPLOY_TX_QUERY';
  } else if (operationName === 'TX_ID_QUERY' || trimmedQuery.includes('TX_ID_QUERY')) {
    resolvedOp = 'TX_ID_QUERY';
  } else if (trimmedQuery.includes('__typename')) {
    resolvedOp = 'IntrospectionQuery';
  } else {
    throw new Error(`Unauthorized GraphQL operation: ${operationName || 'unnamed'}`);
  }

  // Strict variable validation based on operation
  const safeVariables: Record<string, any> = {};
  const rawVars = variables && typeof variables === 'object' && !Array.isArray(variables) ? variables : {};

  // Check for prototype poisoning attempts
  if (Object.prototype.hasOwnProperty.call(rawVars, '__proto__') || Object.prototype.hasOwnProperty.call(rawVars, 'constructor')) {
    throw new Error('Invalid variable object properties');
  }

  if (resolvedOp === 'CONTRACT_STATE_QUERY' || resolvedOp === 'DEPLOY_CONTRACT_STATE_TX_QUERY' || resolvedOp === 'DEPLOY_TX_QUERY') {
    if (typeof rawVars.address !== 'string' || !HEX_ADDRESS_REGEX.test(rawVars.address)) {
      throw new Error('Address variable must be a 64-66 character hexadecimal string');
    }
    safeVariables.address = rawVars.address;

    if (rawVars.offset !== undefined && rawVars.offset !== null) {
      if (typeof rawVars.offset !== 'object' || Array.isArray(rawVars.offset)) {
        throw new Error('Offset variable must be an object or null');
      }
      safeVariables.offset = rawVars.offset;
    } else {
      safeVariables.offset = null;
    }
  } else if (resolvedOp === 'TX_ID_QUERY') {
    if (!rawVars.offset || typeof rawVars.offset !== 'object' || typeof rawVars.offset.identifier !== 'string') {
      throw new Error('TX_ID_QUERY requires offset.identifier');
    }
    if (!HEX_TXID_REGEX.test(rawVars.offset.identifier)) {
      throw new Error('identifier variable must be a 64-72 character hexadecimal string');
    }
    safeVariables.offset = { identifier: rawVars.offset.identifier };
  }

  return {
    operationName: resolvedOp,
    query: trimmedQuery,
    variables: safeVariables,
  };
}

/**
 * Sanitizes any text, errors, or objects so that Blockfrost project IDs / tokens
 * or internal URLs are never shown in response payloads or headers.
 */
export function sanitizeOutput(payload: string): string {
  if (!payload) return '';
  return payload
    .replace(/([?&]project_id=)[^& \r\n\t'"`)]*/gi, '$1[REDACTED]')
    .replace(/(project_id[:=]\s*)[^\s&,;'"`)]{6,}/gi, '$1[REDACTED]')
    .replace(/\b((?:midnight)?(?:preprod|mainnet|preview)[a-zA-Z0-9]{20,})\b/g, '[REDACTED_TOKEN]');
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

function sendResponse(res: any, status: number, data: unknown, fromCache = false) {
  const sanitizedString = sanitizeOutput(JSON.stringify(data));
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
  if (fromCache) {
    headers['X-Cache'] = 'HIT';
  }

  if (typeof res.status === 'function') {
    res.status(status);
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
    res.end(sanitizedString);
  } else {
    res.writeHead(status, headers);
    res.end(sanitizedString);
  }
}

export default async function handler(req: any, res: any) {
  // 1. Strict Method Restriction
  if (req.method !== 'POST') {
    sendResponse(res, 405, { error: 'Method not allowed. Midnight indexer gateway accepts POST only.' });
    return;
  }

  // 2. Origin & Abuse Restrictions
  const origin = req.headers?.origin || req.headers?.referer;
  if (!isAllowedOrigin(origin, req.headers?.host)) {
    sendResponse(res, 403, { error: 'Cross-origin request rejected by gateway security policy.' });
    return;
  }

  // 3. Trusted IP Rate Limiting
  const clientIp = extractClientIp(req);
  if (isRateLimited(clientIp)) {
    sendResponse(res, 429, { error: 'Rate limit exceeded. Too many indexer requests from this address.' });
    return;
  }

  // 4. Request Body Reading and Size Enforcement
  let rawBody: string;
  try {
    rawBody = await readBody(req);
  } catch (err: any) {
    if (err.message === 'PAYLOAD_TOO_LARGE') {
      sendResponse(res, 413, { error: 'Payload too large. Maximum GraphQL request size is 8KB.' });
      return;
    }
    sendResponse(res, 400, { error: 'Failed to read request body.' });
    return;
  }

  // 5. GraphQL Operation and Variable Validation
  let validated: ValidatedGraphQLRequest;
  try {
    const parsed = JSON.parse(rawBody);
    validated = validateAndSanitizeRequest(parsed);
  } catch (valErr: any) {
    sendResponse(res, 400, { error: `Invalid GraphQL query: ${valErr.message}` });
    return;
  }

  // 6. Query Caching for Read Operations (Protecting Blockfrost Quotas)
  const cacheKey = `${validated.operationName}:${JSON.stringify(validated.variables)}`;
  const now = Date.now();
  const cached = queryCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    sendResponse(res, cached.status, JSON.parse(cached.body), true);
    return;
  }

  // 7. Server-Side Blockfrost Project Credential Retrieval
  const projectId = process.env.BLOCKFROST_PROJECT_ID || process.env.BLOCKFROST_PREPROD_PROJECT_ID;
  if (!projectId || projectId.trim().length === 0) {
    sendResponse(res, 503, {
      error: 'Server-side Blockfrost fallback is not configured. Set BLOCKFROST_PROJECT_ID in server environment.',
    });
    return;
  }

  // Official Blockfrost Preprod GraphQL Gateway Endpoint
  const blockfrostEndpoint = 'https://midnight-preprod.blockfrost.io/api/v0';

  // 8. Secure Forwarding with Upstream Timeout and Header Authentication
  try {
    const upstreamRes = await fetch(blockfrostEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        project_id: projectId.trim(),
      },
      body: JSON.stringify({
        query: validated.query,
        variables: validated.variables,
        operationName: validated.operationName !== 'IntrospectionQuery' ? validated.operationName : undefined,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const upstreamText = await upstreamRes.text();
    let upstreamData: any;
    try {
      upstreamData = JSON.parse(upstreamText);
    } catch {
      sendResponse(res, 502, { error: 'Invalid response received from upstream Blockfrost indexer.' });
      return;
    }

    // Cache successful contract queries for short TTL
    if (upstreamRes.status === 200 && (validated.operationName === 'CONTRACT_STATE_QUERY' || validated.operationName === 'DEPLOY_CONTRACT_STATE_TX_QUERY')) {
      queryCache.set(cacheKey, {
        expiresAt: now + CACHE_TTL_MS,
        status: 200,
        body: JSON.stringify(upstreamData),
      });
    }

    sendResponse(res, upstreamRes.status, upstreamData);
  } catch (upstreamErr: any) {
    if (upstreamErr.name === 'TimeoutError' || upstreamErr.name === 'AbortError') {
      sendResponse(res, 504, { error: 'Upstream Midnight indexer gateway timed out (8s limit).' });
      return;
    }
    sendResponse(res, 502, { error: 'Upstream Midnight indexer gateway connection failure.' });
  }
}
