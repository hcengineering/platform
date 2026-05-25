//
// Copyright © 2026 Hardcore Engineering Inc.
//

export type FilterDecodeReason =
  | 'malformed'
  | 'invalid-json'
  | 'not-object'
  | 'prototype-pollution'
  | 'too-deep'

export class FilterDecodeError extends Error {
  constructor (
    message: string,
    public readonly reason: FilterDecodeReason
  ) {
    super(message)
    this.name = 'FilterDecodeError'
  }
}

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype'
])

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

const MAX_NESTING_DEPTH = 32

function rejectPollutionDeep (node: unknown, path: string, depth: number): void {
  if (depth > MAX_NESTING_DEPTH) {
    throw new FilterDecodeError(
      `filter exceeds maximum nesting depth (${MAX_NESTING_DEPTH}) at ${path}`,
      'too-deep'
    )
  }
  if (node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item, i) => rejectPollutionDeep(item, `${path}[${i}]`, depth + 1))
    return
  }
  for (const k of Object.keys(node as object)) {
    if (FORBIDDEN_KEYS.has(k)) {
      throw new FilterDecodeError(
        `filter contains forbidden key at ${path}.${k}`,
        'prototype-pollution'
      )
    }
    rejectPollutionDeep((node as Record<string, unknown>)[k], `${path}.${k}`, depth + 1)
  }
}

export function decodeFilterParam (raw: unknown): Record<string, any> {
  if (raw === undefined || raw === null || raw === '') return {}
  if (typeof raw !== 'string') {
    throw new FilterDecodeError('filter must be a base64-encoded string', 'malformed')
  }

  if (!BASE64_RE.test(raw) || raw.length % 4 !== 0) {
    throw new FilterDecodeError('filter is not valid base64', 'malformed')
  }

  let json: string
  try {
    json = Buffer.from(raw, 'base64').toString('utf-8')
  } catch {
    throw new FilterDecodeError('filter is not valid base64', 'malformed')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new FilterDecodeError('filter is not valid JSON', 'invalid-json')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new FilterDecodeError('filter must be a JSON object', 'not-object')
  }

  rejectPollutionDeep(parsed, 'filter', 0)

  return parsed as Record<string, any>
}
