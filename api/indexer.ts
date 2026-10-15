import { createHash } from 'node:crypto';
import {
  parse,
  print,
  type DocumentNode,
  type OperationDefinitionNode,
  type FieldNode,
  type SelectionNode,
} from 'graphql';

// Security & Resource Constraints
export const MAX_BODY_BYTES = 8 * 1024; // 8KB (Midnight queries are ~500-1500 bytes)
export const UPSTREAM_TIMEOUT_MS = 8_000; // 8 seconds
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/minute per client IP
export const MAX_CONCURRENT_REQUESTS = 10; // Max concurrent in-flight requests per lambda instance
export const UPSTREAM_HOURLY_WINDOW_MS = 3_600_000; // 1 hour
export const MAX_UPSTREAM_REQUESTS_PER_HOUR = Number(process.env.MAX_HOURLY_UPSTREAM_REQUESTS) || 1200;
export const CACHE_TTL_MS = 5_000; // 5 seconds LRU cache for identical read queries

// Global Instance State
let inFlightRequests = 0;
let upstreamHourlyCount = 0;
let upstreamHourlyWindowStart = Date.now();

const ipRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const queryCache = new Map<string, { expiresAt: number; status: number; body: string }>();

export function getInFlightRequests(): number {
  return inFlightRequests;
}

export function resetInstanceStateForTesting(): void {
  inFlightRequests = 0;
  upstreamHourlyCount = 0;
  upstreamHourlyWindowStart = Date.now();
  ipRateLimitMap.clear();
  queryCache.clear();
}

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

export interface RateLimitResult {
  readonly limited: boolean;
  readonly remaining: number;
  readonly resetSeconds: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  cleanupMemory(now);
  const entry = ipRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRateLimitMap.set(ip, { count: 1, windowStart: now });
    return {
      limited: false,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }
  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count);
  const resetSeconds = Math.max(1, Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000));
  return {
    limited: entry.count > MAX_REQUESTS_PER_WINDOW,
    remaining,
    resetSeconds,
  };
}

export function isRateLimited(ip: string): boolean {
  return checkRateLimit(ip).limited;
}

/**
 * Returns the exact set of authorized origins.
 * Wildcard or loose '.vercel.app' matches are strictly forbidden.
 */
export function getAllowedOrigins(): Set<string> {
  const allowed = new Set<string>([
    'https://common-veil.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ]);

  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.trim().replace(/^https?:\/\//, '');
    allowed.add(`https://${host}`);
  }

  if (process.env.ALLOWED_ORIGINS) {
    for (const origin of process.env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) {
        allowed.add(trimmed);
      }
    }
  }

  return allowed;
}

/**
 * Validates Origin and Referer against exact configured deployment origins.
 * Treats Origin and Referer only as supplementary browser controls, never as API authentication.
 */
export function isAllowedOrigin(originHeader: unknown, refererHeader?: unknown): boolean {
  if (!originHeader && !refererHeader) {
    return true; // Direct non-browser invocations or same-host calls
  }

  const allowed = getAllowedOrigins();

  if (typeof originHeader === 'string' && originHeader.trim().length > 0) {
    try {
      const parsed = new URL(originHeader.trim()).origin;
      if (!allowed.has(parsed)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (typeof refererHeader === 'string' && refererHeader.trim().length > 0) {
    try {
      const parsed = new URL(refererHeader.trim()).origin;
      if (!allowed.has(parsed)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

// Exactly allowed GraphQL operations genuinely used by CommonVeil
export type AllowedOperationName =
  | 'CONTRACT_STATE_QUERY'
  | 'DEPLOY_CONTRACT_STATE_TX_QUERY'
  | 'DEPLOY_TX_QUERY'
  | 'TX_ID_QUERY'
  | 'IntrospectionQuery';

export interface ValidatedGraphQLRequest {
  readonly operationName: AllowedOperationName;
  readonly canonicalQuery: string;
  readonly variables: Record<string, any>;
  readonly ast: DocumentNode;
}

const HEX_ADDRESS_REGEX = /^[0-9a-fA-F]{64,66}$/;
const HEX_TXID_REGEX = /^[0-9a-fA-F]{64,72}$/;

function checkSelections(selections: readonly SelectionNode[], maxDepth = 6, currentDepth = 1): void {
  if (currentDepth > maxDepth) {
    throw new Error(`Query selection depth exceeds limit of ${maxDepth}`);
  }
  for (const sel of selections) {
    if (sel.directives && sel.directives.length > 0) {
      throw new Error('GraphQL directives are forbidden');
    }
    if (sel.kind === 'Field') {
      if (sel.alias) {
        throw new Error('GraphQL field aliases are forbidden');
      }
      if (sel.selectionSet) {
        checkSelections(sel.selectionSet.selections, maxDepth, currentDepth + 1);
      }
    } else if (sel.kind === 'InlineFragment') {
      if (sel.selectionSet) {
        checkSelections(sel.selectionSet.selections, maxDepth, currentDepth + 1);
      }
    } else if (sel.kind === 'FragmentSpread') {
      throw new Error('Fragment spreads are forbidden in indexer gateway queries');
    }
  }
}

function assertNoPrototypePoisoning(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('Invalid variable object properties');
    }
    const val = obj[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      assertNoPrototypePoisoning(val);
    }
  }
}

/**
 * Strict AST, shape, and variable validator for GraphQL indexer queries.
 * Enforces allowed operations, fields, arguments, variable types, and operation counts.
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

  let ast: DocumentNode;
  try {
    ast = parse(trimmedQuery);
  } catch (err: any) {
    throw new Error(`Malformed GraphQL query syntax: ${err.message}`);
  }

  // Exactly 1 operation definition allowed
  if (ast.definitions.length !== 1) {
    throw new Error(`Query must contain exactly one operation definition (found ${ast.definitions.length})`);
  }

  const def = ast.definitions[0];
  if (def.kind !== 'OperationDefinition') {
    throw new Error('Only operation definitions are allowed');
  }

  if (def.operation !== 'query') {
    throw new Error('Only query operations are permitted (mutations and subscriptions are forbidden)');
  }

  if (def.directives && def.directives.length > 0) {
    throw new Error('GraphQL directives are forbidden');
  }

  // Check selection depth, directives, and aliases
  checkSelections(def.selectionSet.selections);

  const rawVars = variables && typeof variables === 'object' && !Array.isArray(variables) ? variables : {};
  assertNoPrototypePoisoning(rawVars);

  const parsedOpName = def.name?.value;
  const rootField = def.selectionSet.selections[0];
  if (rootField.kind !== 'Field') {
    throw new Error('Root selection must be a field');
  }

  const rootFieldName = rootField.name.value;

  let resolvedOp: AllowedOperationName;
  const safeVariables: Record<string, any> = {};

  if (parsedOpName === 'CONTRACT_STATE_QUERY' || rootFieldName === 'contractAction') {
    // Check if it's CONTRACT_STATE_QUERY or DEPLOY queries
    if (parsedOpName === 'DEPLOY_CONTRACT_STATE_TX_QUERY') {
      resolvedOp = 'DEPLOY_CONTRACT_STATE_TX_QUERY';
    } else if (parsedOpName === 'DEPLOY_TX_QUERY') {
      resolvedOp = 'DEPLOY_TX_QUERY';
    } else {
      resolvedOp = 'CONTRACT_STATE_QUERY';
    }

    // Verify allowed variable keys
    for (const key of Object.keys(rawVars)) {
      if (key !== 'address' && key !== 'offset') {
        throw new Error(`Unexpected variable '${key}' for operation ${resolvedOp}`);
      }
    }

    // Address validation (required 64-66 hex chars)
    if (typeof rawVars.address !== 'string' || !HEX_ADDRESS_REGEX.test(rawVars.address)) {
      throw new Error('Address variable must be a 64-66 character hexadecimal string');
    }
    safeVariables.address = rawVars.address;

    // Offset validation
    if (rawVars.offset !== undefined && rawVars.offset !== null) {
      if (typeof rawVars.offset !== 'object' || Array.isArray(rawVars.offset)) {
        throw new Error('Offset variable must be an object or null');
      }
      for (const k of Object.keys(rawVars.offset)) {
        if (k !== 'hash' && k !== 'height') {
          throw new Error(`Unexpected property '${k}' in offset variable`);
        }
      }
      const offsetObj: Record<string, any> = {};
      if (rawVars.offset.hash !== undefined) {
        if (typeof rawVars.offset.hash !== 'string' || !HEX_ADDRESS_REGEX.test(rawVars.offset.hash)) {
          throw new Error('Offset hash must be a valid hexadecimal hash string');
        }
        offsetObj.hash = rawVars.offset.hash;
      }
      if (rawVars.offset.height !== undefined) {
        if (typeof rawVars.offset.height !== 'number' || !Number.isInteger(rawVars.offset.height) || rawVars.offset.height < 0) {
          throw new Error('Offset height must be a non-negative integer');
        }
        offsetObj.height = rawVars.offset.height;
      }
      safeVariables.offset = offsetObj;
    } else {
      safeVariables.offset = null;
    }
  } else if (parsedOpName === 'TX_ID_QUERY' || rootFieldName === 'transactions') {
    resolvedOp = 'TX_ID_QUERY';

    for (const key of Object.keys(rawVars)) {
      if (key !== 'offset') {
        throw new Error(`Unexpected variable '${key}' for TX_ID_QUERY`);
      }
    }

    if (!rawVars.offset || typeof rawVars.offset !== 'object' || Array.isArray(rawVars.offset)) {
      throw new Error('TX_ID_QUERY requires an offset object');
    }
    for (const k of Object.keys(rawVars.offset)) {
      if (k !== 'identifier') {
        throw new Error(`Unexpected property '${k}' in TX_ID_QUERY offset`);
      }
    }
    if (typeof rawVars.offset.identifier !== 'string' || !HEX_TXID_REGEX.test(rawVars.offset.identifier)) {
      throw new Error('Transaction identifier must be a 64-72 character hexadecimal string');
    }
    safeVariables.offset = { identifier: rawVars.offset.identifier };
  } else if (parsedOpName === 'IntrospectionQuery' || rootFieldName === '__schema' || rootFieldName === '__typename') {
    resolvedOp = 'IntrospectionQuery';
    if (Object.keys(rawVars).length > 0) {
      throw new Error('IntrospectionQuery does not accept variables');
    }
  } else {
    throw new Error(`Unauthorized GraphQL operation: ${parsedOpName || rootFieldName || 'unknown'}`);
  }

  const canonicalQuery = print(ast);

  return {
    operationName: resolvedOp,
    canonicalQuery,
    variables: safeVariables,
    ast,
  };
}

/**
 * Deterministically serializes values with sorted object keys.
 */
function deterministicStringify(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(deterministicStringify).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + deterministicStringify((val as any)[k])).join(',') + '}';
}

/**
 * Computes a deterministic SHA-256 cache key including operationName, canonical query, and variables.
 */
export function computeCacheKey(
  operationName: string,
  canonicalQuery: string,
  variables: Record<string, any>,
): string {
  const hash = createHash('sha256')
    .update(`${operationName}\n${canonicalQuery}\n${deterministicStringify(variables)}`)
    .digest('hex');
  return `${operationName}:${hash}`;
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

export async function readBody(req: any): Promise<string> {
  if (req.body !== undefined && req.body !== null) {
    let bodyStr = '';
    let size = 0;
    if (typeof req.body === 'string') {
      bodyStr = req.body;
      size = Buffer.byteLength(req.body, 'utf8');
    } else if (Buffer.isBuffer(req.body)) {
      bodyStr = req.body.toString('utf8');
      size = req.body.length;
    } else if (typeof req.body === 'object') {
      bodyStr = JSON.stringify(req.body);
      size = Buffer.byteLength(bodyStr, 'utf8');
    }
    if (size > MAX_BODY_BYTES) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    return bodyStr;
  }

  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', (chunk: Buffer | string) => {
      const chunkSize = typeof chunk === 'string' ? Buffer.byteLength(chunk, 'utf8') : chunk.length;
      bytes += chunkSize;
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

function sendResponse(
  res: any,
  status: number,
  data: unknown,
  fromCache = false,
  extraHeaders: Record<string, string> = {},
) {
  const sanitizedString = sanitizeOutput(JSON.stringify(data));
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...extraHeaders,
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

function auditLog(entry: {
  ipHash: string;
  operation: string;
  status: number;
  cached: boolean;
  durationMs: number;
  error?: string;
}) {
  console.log(JSON.stringify({ type: 'indexer_audit', ...entry, timestamp: new Date().toISOString() }));
}

export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  const clientIp = extractClientIp(req);
  const ipHash = createHash('sha256').update(clientIp).digest('hex').slice(0, 12);

  // 1. Strict Method Restriction
  if (req.method !== 'POST') {
    sendResponse(res, 405, { error: 'Method not allowed. Midnight indexer gateway accepts POST only.' });
    return;
  }

  // 2. Supplementary Origin / Referer Restrictions
  const origin = req.headers?.origin;
  const referer = req.headers?.referer;
  if (!isAllowedOrigin(origin, referer)) {
    sendResponse(res, 403, { error: 'Cross-origin request rejected by gateway security policy.' });
    return;
  }

  // 3. Trusted IP Rate Limiting & Headers
  const rateLimit = checkRateLimit(clientIp);
  const rateLimitHeaders = {
    'RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
    'RateLimit-Remaining': String(rateLimit.remaining),
    'RateLimit-Reset': String(rateLimit.resetSeconds),
  };

  if (rateLimit.limited) {
    sendResponse(
      res,
      429,
      { error: 'Rate limit exceeded. Too many indexer requests from this address.' },
      false,
      { ...rateLimitHeaders, 'Retry-After': String(rateLimit.resetSeconds) },
    );
    return;
  }

  // 4. Request Body Reading and Size Enforcement (even when pre-parsed by Vercel)
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

  // 5. Parsed GraphQL AST & Variable Validation
  let validated: ValidatedGraphQLRequest;
  try {
    const parsed = JSON.parse(rawBody);
    validated = validateAndSanitizeRequest(parsed);
  } catch (valErr: any) {
    sendResponse(res, 400, { error: `Invalid GraphQL query: ${valErr.message}` }, false, rateLimitHeaders);
    return;
  }

  // 6. Cache Identity: Document and Variable Bound
  const cacheKey = computeCacheKey(validated.operationName, validated.canonicalQuery, validated.variables);
  const now = Date.now();
  const cached = queryCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    auditLog({
      ipHash,
      operation: validated.operationName,
      status: cached.status,
      cached: true,
      durationMs: Date.now() - startTime,
    });
    sendResponse(res, cached.status, JSON.parse(cached.body), true, rateLimitHeaders);
    return;
  }

  // 7. Concurrency Safeguard
  if (inFlightRequests >= MAX_CONCURRENT_REQUESTS) {
    sendResponse(
      res,
      429,
      { error: 'Too many concurrent requests in flight. Please retry momentarily.' },
      false,
      { ...rateLimitHeaders, 'Retry-After': '1' },
    );
    return;
  }

  // 8. Hourly Upstream Quota Protection
  if (now - upstreamHourlyWindowStart > UPSTREAM_HOURLY_WINDOW_MS) {
    upstreamHourlyWindowStart = now;
    upstreamHourlyCount = 0;
  }
  if (upstreamHourlyCount >= MAX_UPSTREAM_REQUESTS_PER_HOUR) {
    sendResponse(
      res,
      429,
      { error: 'Gateway hourly quota limit reached. Request rejected to prevent upstream suspension.' },
      false,
      { ...rateLimitHeaders, 'Retry-After': '60' },
    );
    return;
  }

  // 9. Server-Side Blockfrost Project Credential Retrieval
  const projectId = process.env.BLOCKFROST_PROJECT_ID || process.env.BLOCKFROST_PREPROD_PROJECT_ID;
  if (!projectId || projectId.trim().length === 0) {
    sendResponse(
      res,
      503,
      {
        error: 'Server-side Blockfrost fallback is not configured. Set BLOCKFROST_PROJECT_ID in server environment.',
      },
      false,
      rateLimitHeaders,
    );
    return;
  }

  // Official Blockfrost Preprod GraphQL Gateway Endpoint
  const blockfrostEndpoint = 'https://midnight-preprod.blockfrost.io/api/v0';

  // 10. Secure Forwarding with Timeout and Error Sanitization
  inFlightRequests++;
  upstreamHourlyCount++;

  try {
    const upstreamRes = await fetch(blockfrostEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        project_id: projectId.trim(),
      },
      body: JSON.stringify({
        query: validated.canonicalQuery,
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
      auditLog({
        ipHash,
        operation: validated.operationName,
        status: 502,
        cached: false,
        durationMs: Date.now() - startTime,
        error: 'Non-JSON upstream response',
      });
      sendResponse(
        res,
        502,
        {
          error: 'Invalid response format received from upstream Midnight indexer.',
          statusCode: upstreamRes.status,
        },
        false,
        rateLimitHeaders,
      );
      return;
    }

    // Sanitize any upstream GraphQL error messages
    if (upstreamData && typeof upstreamData === 'object' && Array.isArray(upstreamData.errors)) {
      upstreamData.errors = upstreamData.errors.map((err: any) => ({
        message: typeof err?.message === 'string' ? sanitizeOutput(err.message) : 'Upstream indexer error',
        locations: err?.locations,
        path: err?.path,
      }));
    }

    // Cache successful contract queries for short TTL
    if (
      upstreamRes.status === 200 &&
      (validated.operationName === 'CONTRACT_STATE_QUERY' || validated.operationName === 'DEPLOY_CONTRACT_STATE_TX_QUERY')
    ) {
      queryCache.set(cacheKey, {
        expiresAt: now + CACHE_TTL_MS,
        status: 200,
        body: JSON.stringify(upstreamData),
      });
    }

    auditLog({
      ipHash,
      operation: validated.operationName,
      status: upstreamRes.status,
      cached: false,
      durationMs: Date.now() - startTime,
    });

    sendResponse(res, upstreamRes.status, upstreamData, false, rateLimitHeaders);
  } catch (upstreamErr: any) {
    const isTimeout = upstreamErr.name === 'TimeoutError' || upstreamErr.name === 'AbortError';
    const status = isTimeout ? 504 : 502;
    const msg = isTimeout
      ? 'Upstream Midnight indexer gateway timed out (8s limit).'
      : 'Upstream Midnight indexer gateway connection failure.';

    auditLog({
      ipHash,
      operation: validated.operationName,
      status,
      cached: false,
      durationMs: Date.now() - startTime,
      error: upstreamErr.message,
    });

    sendResponse(res, status, { error: msg }, false, rateLimitHeaders);
  } finally {
    inFlightRequests = Math.max(0, inFlightRequests - 1);
  }
}
