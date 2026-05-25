//
// Copyright © 2026 Hardcore Engineering Inc.
//

export type FilterDecodeReason =
  | 'malformed'
  | 'invalid-json'
  | 'not-object'
  | 'prototype-pollution'

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

function rejectPollutionDeep (node: unknown, path: string): void {
  if (node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item, i) => rejectPollutionDeep(item, `${path}[${i}]`))
    return
  }
  for (const k of Object.keys(node as object)) {
    if (FORBIDDEN_KEYS.has(k)) {
      throw new FilterDecodeError(
        `filter contains forbidden key at ${path}.${k}`,
        'prototype-pollution'
      )
    }
    rejectPollutionDeep((node as Record<string, unknown>)[k], `${path}.${k}`)
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

  rejectPollutionDeep(parsed, 'filter')

  return parsed as Record<string, any>
}
