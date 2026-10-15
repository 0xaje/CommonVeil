import { createHash } from 'node:crypto';
import dns from 'node:dns';
import {
  parse,
  print,
  type DocumentNode,
  type OperationDefinitionNode,
  type FieldNode,
  type SelectionNode,
  type VariableDefinitionNode,
} from 'graphql';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // No-op if unsupported
}

// Security & Resource Constraints
export const MAX_BODY_BYTES = 8 * 1024; // 8KB (Midnight queries are ~500-1500 bytes)
export const UPSTREAM_TIMEOUT_MS = 8_000; // 8 seconds
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/minute per client IP (per container instance)
export const MAX_CONCURRENT_REQUESTS = 10; // Max concurrent in-flight requests per container instance
export const UPSTREAM_HOURLY_WINDOW_MS = 3_600_000; // 1 hour
export const MAX_UPSTREAM_REQUESTS_PER_HOUR = Number(process.env.MAX_HOURLY_UPSTREAM_REQUESTS) || 1200;
export const CACHE_TTL_MS = 5_000; // 5 seconds LRU cache for identical read queries

/**
 * ARCHITECTURAL NOTE ON RATE LIMITING AND QUOTA PROTECTION:
 * In Vercel's serverless model, in-memory state (instanceRateLimitMap, instanceHourlyUpstreamCount,
 * instanceInFlightRequests) provides per-container flood and burst defense-in-depth.
 * It is explicitly a PER-INSTANCE protection and does not enforce a global cluster-wide cap across
 * multiple concurrent cold/warm serverless containers.
 *
 * Project-wide / global quota protection relies on:
 * 1) Upstream Blockfrost API Gateway quota and rate limits tied to the server-side project token.
 * 2) Optional shared Upstash / Vercel KV if KV_REST_API_URL and KV_REST_API_TOKEN are configured.
 * 3) Platform edge protection (Vercel DDoS / WAF).
 */

// Per-instance state
let instanceInFlightRequests = 0;
let instanceHourlyUpstreamCount = 0;
let instanceHourlyWindowStart = Date.now();

const instanceRateLimitMap = new Map<string, { count: number; windowStart: number }>();
const queryCache = new Map<string, { expiresAt: number; status: number; body: string }>();

export function getInstanceInFlightRequests(): number {
  return instanceInFlightRequests;
}

export function resetInstanceStateForTesting(): void {
  instanceInFlightRequests = 0;
  instanceHourlyUpstreamCount = 0;
  instanceHourlyWindowStart = Date.now();
  instanceRateLimitMap.clear();
  queryCache.clear();
}

export function getQueryCacheSize(): number {
  return queryCache.size;
}

function cleanupMemory(now: number) {
  if (instanceRateLimitMap.size > 5_000) {
    for (const [ip, entry] of instanceRateLimitMap.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        instanceRateLimitMap.delete(ip);
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
  readonly scope: 'shared-kv' | 'per-instance';
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // Optional platform-level shared KV rate limiter if configured
  if (kvUrl && kvToken) {
    try {
      const windowKey = `rl:${ip}:${Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS)}`;
      const res = await fetch(`${kvUrl}/incr/${windowKey}`, {
        headers: { Authorization: `Bearer ${kvToken}` },
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const currentCount = Number(data.result) || 1;
        if (currentCount === 1) {
          // Set 65s expiration
          await fetch(`${kvUrl}/expire/${windowKey}/65`, {
            headers: { Authorization: `Bearer ${kvToken}` },
          });
        }
        return {
          limited: currentCount > MAX_REQUESTS_PER_WINDOW,
          remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - currentCount),
          resetSeconds: 60,
          scope: 'shared-kv',
        };
      }
    } catch {
      // Gracefully fall through to per-instance limiter
    }
  }

  // Per-instance sliding-window limiter
  const now = Date.now();
  cleanupMemory(now);
  const entry = instanceRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    instanceRateLimitMap.set(ip, { count: 1, windowStart: now });
    return {
      limited: false,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      scope: 'per-instance',
    };
  }
  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count);
  const resetSeconds = Math.max(1, Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000));
  return {
    limited: entry.count > MAX_REQUESTS_PER_WINDOW,
    remaining,
    resetSeconds,
    scope: 'per-instance',
  };
}

/**
 * Returns the exact set of authorized deployment origins.
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
  | 'BLOCK_HASH_QUERY'
  | 'IntrospectionQuery';

export interface ValidatedGraphQLRequest {
  readonly operationName: AllowedOperationName;
  readonly canonicalQuery: string;
  readonly variables: Record<string, any>;
  readonly ast: DocumentNode;
}

const HEX_ADDRESS_REGEX = /^[0-9a-fA-F]{64,66}$/;
const HEX_TXID_REGEX = /^[0-9a-fA-F]{64,72}$/;

// AST Schema Definition Types
interface SchemaNode {
  allowedArgs?: readonly string[];
  fields?: Record<string, SchemaNode | true>;
  fragments?: Record<string, SchemaNode>;
}

const CONTRACT_STATE_QUERY_SCHEMA: SchemaNode = {
  allowedArgs: ['address', 'offset'],
  fields: {
    state: true,
    __typename: true,
  },
};

const DEPLOY_CONTRACT_STATE_TX_SCHEMA: SchemaNode = {
  allowedArgs: ['address'],
  fragments: {
    ContractDeploy: {
      fields: { state: true, __typename: true },
    },
    ContractUpdate: {
      fields: { state: true, __typename: true },
    },
    ContractCall: {
      fields: {
        deploy: {
          fields: {
            transaction: {
              fields: {
                contractActions: {
                  fields: {
                    address: true,
                    state: true,
                    __typename: true,
                  },
                },
                __typename: true,
              },
            },
            __typename: true,
          },
        },
        __typename: true,
      },
    },
  },
  fields: {
    __typename: true,
  },
};

const BLOCK_SUBSELECTION: SchemaNode = {
  fields: {
    height: true,
    hash: true,
    author: true,
    timestamp: true,
    __typename: true,
  },
};

const OUTPUT_SUBSELECTION: SchemaNode = {
  fields: {
    owner: true,
    intentHash: true,
    tokenType: true,
    value: true,
    __typename: true,
  },
};

const REGULAR_TX_FRAGMENT: SchemaNode = {
  fields: {
    identifiers: true,
    fees: {
      fields: {
        estimatedFees: true,
        paidFees: true,
        __typename: true,
      },
    },
    transactionResult: {
      fields: {
        status: true,
        segments: {
          fields: {
            id: true,
            success: true,
            __typename: true,
          },
        },
        __typename: true,
      },
    },
    __typename: true,
  },
};

const TX_FIELDS: Record<string, SchemaNode | true> = {
  id: true,
  protocolVersion: true,
  raw: true,
  hash: true,
  contractActions: {
    fields: {
      address: true,
      __typename: true,
    },
  },
  block: BLOCK_SUBSELECTION,
  unshieldedCreatedOutputs: OUTPUT_SUBSELECTION,
  unshieldedSpentOutputs: OUTPUT_SUBSELECTION,
  __typename: true,
};

const DEPLOY_TX_SCHEMA: SchemaNode = {
  allowedArgs: ['address'],
  fragments: {
    ContractDeploy: {
      fields: {
        transaction: {
          fields: TX_FIELDS,
          fragments: { RegularTransaction: REGULAR_TX_FRAGMENT },
        },
        __typename: true,
      },
    },
    ContractUpdate: {
      fields: {
        transaction: {
          fields: TX_FIELDS,
          fragments: { RegularTransaction: REGULAR_TX_FRAGMENT },
        },
        __typename: true,
      },
    },
    ContractCall: {
      fields: {
        deploy: {
          fields: {
            transaction: {
              fields: TX_FIELDS,
              fragments: { RegularTransaction: REGULAR_TX_FRAGMENT },
            },
            __typename: true,
          },
        },
        __typename: true,
      },
    },
  },
  fields: {
    __typename: true,
  },
};

const TX_ID_QUERY_SCHEMA: SchemaNode = {
  allowedArgs: ['offset'],
  fields: {
    id: true,
    protocolVersion: true,
    raw: true,
    hash: true,
    unshieldedCreatedOutputs: OUTPUT_SUBSELECTION,
    unshieldedSpentOutputs: OUTPUT_SUBSELECTION,
    block: BLOCK_SUBSELECTION,
    __typename: true,
  },
  fragments: {
    RegularTransaction: REGULAR_TX_FRAGMENT,
  },
};

const BLOCK_HASH_SCHEMA: SchemaNode = {
  allowedArgs: ['offset'],
  fields: {
    height: true,
    hash: true,
    __typename: true,
  },
};

const INTROSPECTION_SCHEMA: SchemaNode = {
  fields: {
    __typename: true,
    queryType: {
      fields: { name: true, __typename: true },
    },
    types: true,
  },
};

function validateSelectionSetAgainstSchema(
  selections: readonly SelectionNode[],
  schema: SchemaNode,
  path = '',
  maxDepth = 6,
  currentDepth = 1,
): void {
  if (currentDepth > maxDepth) {
    throw new Error(`Query selection depth exceeds maximum permitted limit (${maxDepth})`);
  }

  for (const sel of selections) {
    if (sel.directives && sel.directives.length > 0) {
      throw new Error('GraphQL directives are strictly forbidden');
    }

    if (sel.kind === 'Field') {
      const fieldName = sel.name.value;
      const currentPath = path ? `${path}.${fieldName}` : fieldName;

      if (sel.alias) {
        throw new Error(`Field alias '${sel.alias.value}' on '${currentPath}' is forbidden`);
      }

      const fieldSchema = schema.fields?.[fieldName];
      if (!fieldSchema) {
        throw new Error(`Unauthorized field '${fieldName}' under path '${path || 'root'}'. Only exact SDK fields are permitted.`);
      }

      if (sel.arguments && sel.arguments.length > 0) {
        const allowedArgs = (fieldSchema !== true && fieldSchema.allowedArgs) || schema.allowedArgs || [];
        for (const arg of sel.arguments) {
          if (!allowedArgs.includes(arg.name.value)) {
            throw new Error(`Unauthorized argument '${arg.name.value}' on field '${currentPath}'`);
          }
        }
      }

      if (sel.selectionSet) {
        if (fieldSchema === true) {
          throw new Error(`Field '${currentPath}' is a terminal scalar and cannot have nested selections`);
        }
        validateSelectionSetAgainstSchema(sel.selectionSet.selections, fieldSchema, currentPath, maxDepth, currentDepth + 1);
      }
    } else if (sel.kind === 'InlineFragment') {
      const typeName = sel.typeCondition?.name.value;
      if (!typeName) {
        throw new Error(`Untyped inline fragments are forbidden under path '${path}'`);
      }
      const fragSchema = schema.fragments?.[typeName];
      if (!fragSchema) {
        throw new Error(`Unauthorized inline fragment on type '${typeName}' under path '${path}'`);
      }
      if (sel.selectionSet) {
        validateSelectionSetAgainstSchema(
          sel.selectionSet.selections,
          fragSchema,
          `${path} (on ${typeName})`,
          maxDepth,
          currentDepth + 1,
        );
      }
    } else {
      throw new Error('Fragment spreads are strictly forbidden in indexer gateway queries');
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
 * Strict AST, shape, argument, and variable validator for GraphQL indexer queries.
 * Enforces allowed operations, exact field trees, arguments, variable types, and operation counts.
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

  // Exactly 1 root selection allowed
  if (def.selectionSet.selections.length !== 1) {
    throw new Error(`Query must contain exactly one root selection (found ${def.selectionSet.selections.length}). Multiple root selections are forbidden.`);
  }

  const rootSel = def.selectionSet.selections[0];
  if (rootSel.kind !== 'Field') {
    throw new Error('Root selection must be a field');
  }

  if (rootSel.alias) {
    throw new Error(`Field alias '${rootSel.alias.value}' on '${rootSel.name.value}' is forbidden`);
  }

  if (rootSel.directives && rootSel.directives.length > 0) {
    throw new Error(`GraphQL directives on '${rootSel.name.value}' are forbidden`);
  }

  const rootFieldName = rootSel.name.value;
  const parsedOpName = def.name?.value;
  const rawVars = variables && typeof variables === 'object' && !Array.isArray(variables) ? variables : {};
  assertNoPrototypePoisoning(rawVars);

  let resolvedOp: AllowedOperationName;
  const safeVariables: Record<string, any> = {};

  // Validate allowed variable definitions in query AST
  const queryVarNames = (def.variableDefinitions || []).map((v) => v.variable.name.value);

  if (rootFieldName === 'contractAction') {
    // Distinguish CONTRACT_STATE_QUERY vs DEPLOY_CONTRACT_STATE_TX_QUERY vs DEPLOY_TX_QUERY
    const hasInlineFragments = rootSel.selectionSet?.selections.some((s) => s.kind === 'InlineFragment');
    if (!hasInlineFragments) {
      resolvedOp = 'CONTRACT_STATE_QUERY';
      // Verify variable definitions
      for (const vName of queryVarNames) {
        if (vName !== 'address' && vName !== 'offset') {
          throw new Error(`Unauthorized variable definition '$${vName}' for operation CONTRACT_STATE_QUERY`);
        }
      }
      // Exact field validation
      validateSelectionSetAgainstSchema(rootSel.selectionSet?.selections || [], CONTRACT_STATE_QUERY_SCHEMA, 'contractAction');
    } else {
      // Check if it's DEPLOY_TX_QUERY (inspects transaction block) or DEPLOY_CONTRACT_STATE_TX_QUERY
      const queryStr = trimmedQuery;
      if (queryStr.includes('RegularTransaction') || queryStr.includes('unshieldedCreatedOutputs')) {
        resolvedOp = 'DEPLOY_TX_QUERY';
        validateSelectionSetAgainstSchema(rootSel.selectionSet?.selections || [], DEPLOY_TX_SCHEMA, 'contractAction');
      } else {
        resolvedOp = 'DEPLOY_CONTRACT_STATE_TX_QUERY';
        validateSelectionSetAgainstSchema(rootSel.selectionSet?.selections || [], DEPLOY_CONTRACT_STATE_TX_SCHEMA, 'contractAction');
      }
      for (const vName of queryVarNames) {
        if (vName !== 'address') {
          throw new Error(`Unauthorized variable definition '$${vName}' for operation ${resolvedOp}`);
        }
      }
    }

    // Check variable values
    for (const key of Object.keys(rawVars)) {
      if (key !== 'address' && key !== 'offset') {
        throw new Error(`Unexpected variable '${key}' for operation ${resolvedOp}`);
      }
    }
    if (typeof rawVars.address !== 'string' || !HEX_ADDRESS_REGEX.test(rawVars.address)) {
      throw new Error('Address variable must be a 64-66 character hexadecimal string');
    }
    safeVariables.address = rawVars.address;

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
  } else if (rootFieldName === 'transactions') {
    resolvedOp = 'TX_ID_QUERY';
    for (const vName of queryVarNames) {
      if (vName !== 'offset') {
        throw new Error(`Unauthorized variable definition '$${vName}' for operation TX_ID_QUERY`);
      }
    }
    validateSelectionSetAgainstSchema(rootSel.selectionSet?.selections || [], TX_ID_QUERY_SCHEMA, 'transactions');

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
  } else if (rootFieldName === 'block') {
    resolvedOp = 'BLOCK_HASH_QUERY';
    for (const vName of queryVarNames) {
      if (vName !== 'offset') {
        throw new Error(`Unauthorized variable definition '$${vName}' for operation BLOCK_HASH_QUERY`);
      }
    }
    validateSelectionSetAgainstSchema(rootSel.selectionSet?.selections || [], BLOCK_HASH_SCHEMA, 'block');

    if (rawVars.offset !== undefined && rawVars.offset !== null) {
      if (typeof rawVars.offset !== 'object' || Array.isArray(rawVars.offset)) {
        throw new Error('Block offset must be an object or null');
      }
      safeVariables.offset = rawVars.offset;
    }
  } else if (rootFieldName === '__schema' || rootFieldName === '__typename') {
    resolvedOp = 'IntrospectionQuery';
    if (queryVarNames.length > 0) {
      throw new Error('IntrospectionQuery does not accept variable definitions');
    }
    if (rootSel.selectionSet) {
      validateSelectionSetAgainstSchema(rootSel.selectionSet.selections, INTROSPECTION_SCHEMA, rootFieldName);
    }
    if (Object.keys(rawVars).length > 0) {
      throw new Error('IntrospectionQuery does not accept variables');
    }
  } else {
    throw new Error(`Unauthorized GraphQL root field: '${rootFieldName}'. Only genuine Midnight SDK fields are allowed.`);
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

export type SafeErrorCategory =
  | 'METHOD_NOT_ALLOWED'
  | 'ORIGIN_REJECTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PAYLOAD_TOO_LARGE'
  | 'MALFORMED_JSON'
  | 'INVALID_GRAPHQL_QUERY'
  | 'CONCURRENCY_LIMIT_EXCEEDED'
  | 'HOURLY_QUOTA_EXCEEDED'
  | 'SERVER_MISCONFIGURED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_NETWORK_ERROR'
  | 'UPSTREAM_NON_JSON'
  | 'UPSTREAM_GRAPHQL_ERROR';

function auditLog(entry: {
  ipHash: string;
  operation: string;
  status: number;
  cached: boolean;
  durationMs: number;
  errorCategory?: SafeErrorCategory;
}) {
  console.log(JSON.stringify({ type: 'indexer_audit', ...entry, timestamp: new Date().toISOString() }));
}

export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  const clientIp = extractClientIp(req);
  const ipHash = createHash('sha256').update(clientIp).digest('hex').slice(0, 12);

  // 1. Strict Method Restriction
  if (req.method !== 'POST') {
    auditLog({
      ipHash,
      operation: 'UNKNOWN',
      status: 405,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: 'METHOD_NOT_ALLOWED',
    });
    sendResponse(res, 405, { error: 'Method not allowed. Midnight indexer gateway accepts POST only.' });
    return;
  }

  // 2. Supplementary Origin / Referer Restrictions
  const origin = req.headers?.origin;
  const referer = req.headers?.referer;
  if (!isAllowedOrigin(origin, referer)) {
    auditLog({
      ipHash,
      operation: 'UNKNOWN',
      status: 403,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: 'ORIGIN_REJECTED',
    });
    sendResponse(res, 403, { error: 'Cross-origin request rejected by gateway security policy.' });
    return;
  }

  // 3. Trusted IP Rate Limiting & Headers (Shared KV or per-instance fallback)
  const rateLimit = await checkRateLimit(clientIp);
  const rateLimitHeaders = {
    'RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
    'RateLimit-Remaining': String(rateLimit.remaining),
    'RateLimit-Reset': String(rateLimit.resetSeconds),
  };

  if (rateLimit.limited) {
    auditLog({
      ipHash,
      operation: 'UNKNOWN',
      status: 429,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: 'RATE_LIMIT_EXCEEDED',
    });
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
    const isTooLarge = err.message === 'PAYLOAD_TOO_LARGE';
    const status = isTooLarge ? 413 : 400;
    const cat: SafeErrorCategory = isTooLarge ? 'PAYLOAD_TOO_LARGE' : 'MALFORMED_JSON';
    auditLog({
      ipHash,
      operation: 'UNKNOWN',
      status,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: cat,
    });
    sendResponse(res, status, { error: isTooLarge ? 'Payload too large. Maximum GraphQL request size is 8KB.' : 'Failed to read request body.' });
    return;
  }

  // 5. Parsed GraphQL AST, Selection Tree, and Variable Validation
  let validated: ValidatedGraphQLRequest;
  try {
    const parsed = JSON.parse(rawBody);
    validated = validateAndSanitizeRequest(parsed);
  } catch (valErr: any) {
    auditLog({
      ipHash,
      operation: 'UNKNOWN',
      status: 400,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: 'INVALID_GRAPHQL_QUERY',
    });
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

  // 7. Per-Instance Concurrency Safeguard
  if (instanceInFlightRequests >= MAX_CONCURRENT_REQUESTS) {
    auditLog({
      ipHash,
      operation: validated.operationName,
      status: 429,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: 'CONCURRENCY_LIMIT_EXCEEDED',
    });
    sendResponse(
      res,
      429,
      { error: 'Too many concurrent requests in flight. Please retry momentarily.' },
      false,
      { ...rateLimitHeaders, 'Retry-After': '1' },
    );
    return;
  }

  // 8. Per-Instance Hourly Upstream Quota Protection
  if (now - instanceHourlyWindowStart > UPSTREAM_HOURLY_WINDOW_MS) {
    instanceHourlyWindowStart = now;
    instanceHourlyUpstreamCount = 0;
  }
  if (instanceHourlyUpstreamCount >= MAX_UPSTREAM_REQUESTS_PER_HOUR) {
    auditLog({
      ipHash,
      operation: validated.operationName,
      status: 429,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: 'HOURLY_QUOTA_EXCEEDED',
    });
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
    auditLog({
      ipHash,
      operation: validated.operationName,
      status: 503,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: 'SERVER_MISCONFIGURED',
    });
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
  instanceInFlightRequests++;
  instanceHourlyUpstreamCount++;

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
        errorCategory: 'UPSTREAM_NON_JSON',
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

    const hasGraphQLErrors = Array.isArray(upstreamData?.errors) && upstreamData.errors.length > 0;
    if (hasGraphQLErrors) {
      upstreamData.errors = upstreamData.errors.map((err: any) => ({
        message: typeof err?.message === 'string' ? sanitizeOutput(err.message) : 'Upstream indexer error',
        locations: err?.locations,
        path: err?.path,
      }));
    }

    // STRICT CACHE ADMISSION POLICY:
    // Only cache if HTTP 200, ZERO GraphQL errors, and genuine contract state is present.
    // Never cache empty states, null results, or responses containing GraphQL errors.
    const hasValidContractState = Boolean(
      upstreamData?.data?.contractAction?.state &&
      typeof upstreamData.data.contractAction.state === 'string' &&
      upstreamData.data.contractAction.state.length > 0
    );

    if (
      upstreamRes.status === 200 &&
      !hasGraphQLErrors &&
      hasValidContractState &&
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
      errorCategory: hasGraphQLErrors ? 'UPSTREAM_GRAPHQL_ERROR' : undefined,
    });

    sendResponse(res, upstreamRes.status, upstreamData, false, rateLimitHeaders);
  } catch (upstreamErr: any) {
    const isTimeout = upstreamErr.name === 'TimeoutError' || upstreamErr.name === 'AbortError';
    const status = isTimeout ? 504 : 502;
    const cat: SafeErrorCategory = isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_NETWORK_ERROR';
    const msg = isTimeout
      ? 'Upstream Midnight indexer gateway timed out (8s limit).'
      : 'Upstream Midnight indexer gateway connection failure.';

    auditLog({
      ipHash,
      operation: validated.operationName,
      status,
      cached: false,
      durationMs: Date.now() - startTime,
      errorCategory: cat,
    });

    sendResponse(res, status, { error: msg }, false, rateLimitHeaders);
  } finally {
    instanceInFlightRequests = Math.max(0, instanceInFlightRequests - 1);
  }
}
