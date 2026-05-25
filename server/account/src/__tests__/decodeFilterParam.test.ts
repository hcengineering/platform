import { decodeFilterParam, FilterDecodeError } from '../util/decodeFilterParam'

function b64 (s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64')
}

describe('decodeFilterParam', () => {
  it('returns {} on undefined, null, and empty-string input', () => {
    expect(decodeFilterParam(undefined)).toEqual({})
    expect(decodeFilterParam(null)).toEqual({})
    expect(decodeFilterParam('')).toEqual({})
  })

  it('decodes a valid base64-JSON object', () => {
    const out = decodeFilterParam(b64('{"statusIn":["active"]}'))
    expect(out).toEqual({ statusIn: ['active'] })
  })

  it('throws FilterDecodeError on non-string input', () => {
    expect(() => decodeFilterParam(42 as any)).toThrow(FilterDecodeError)
    expect(() => decodeFilterParam({} as any)).toThrow(FilterDecodeError)
  })

  it('throws FilterDecodeError with reason="invalid-json" on bad JSON', () => {
    try {
      decodeFilterParam(b64('{not valid json'))
      fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(FilterDecodeError)
      expect((e as FilterDecodeError).reason).toBe('invalid-json')
    }
  })

  it('throws FilterDecodeError with reason="not-object" on JSON array', () => {
    try {
      decodeFilterParam(b64('[1,2,3]'))
      fail('expected throw')
    } catch (e) {
      expect((e as FilterDecodeError).reason).toBe('not-object')
    }
  })

  it('throws FilterDecodeError with reason="not-object" on JSON scalar', () => {
    expect(() => decodeFilterParam(b64('"hello"'))).toThrow(FilterDecodeError)
    expect(() => decodeFilterParam(b64('42'))).toThrow(FilterDecodeError)
    expect(() => decodeFilterParam(b64('null'))).toThrow(FilterDecodeError)
  })

  it('rejects __proto__ key hard (reason="prototype-pollution")', () => {
    try {
      decodeFilterParam(b64('{"__proto__":{"polluted":true}}'))
      fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(FilterDecodeError)
      expect((e as FilterDecodeError).reason).toBe('prototype-pollution')
    }
  })

  it('rejects constructor + prototype keys hard', () => {
    expect(() => decodeFilterParam(b64('{"constructor":1}'))).toThrow(/forbidden key/)
    expect(() => decodeFilterParam(b64('{"prototype":1}'))).toThrow(/forbidden key/)
  })

  it('rejects forbidden keys at nested levels (recursive guard)', () => {
    expect(() => decodeFilterParam(
      b64('{"lastActivityFilter":{"__proto__":{"polluted":true}}}')
    )).toThrow(/forbidden key/)
    expect(() => decodeFilterParam(
      b64('{"sort":{"nested":{"constructor":1}}}')
    )).toThrow(/forbidden key/)
  })

  it('rejects forbidden keys inside array elements', () => {
    expect(() => decodeFilterParam(
      b64('{"workspaceUuidsIn":[{"__proto__":1}]}')
    )).toThrow(/forbidden key/)
  })

  it('rejects non-base64 characters in input (strict validation)', () => {
    try {
      decodeFilterParam('not!valid$base64')
      fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(FilterDecodeError)
      expect((e as FilterDecodeError).reason).toBe('malformed')
    }
  })

  it('rejects base64-shaped but wrong-length input', () => {
    expect(() => decodeFilterParam('abc')).toThrow(/base64/)
  })

  it('does not pollute Object.prototype after a rejected attempt', () => {
    try { decodeFilterParam(b64('{"__proto__":{"x":42}}')) } catch {}
    expect(({} as any).x).toBeUndefined()
  })

  it('rejects payloads that exceed the nesting-depth cap (DoS guard)', () => {
    // Build an object 100 levels deep — well past the 32 cap.
    let json = 'null'
    for (let i = 0; i < 100; i++) {
      json = `{"a":${json}}`
    }
    try {
      decodeFilterParam(b64(json))
      fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(FilterDecodeError)
      expect((e as FilterDecodeError).reason).toBe('too-deep')
    }
  })

  it('accepts payloads at the edge of the depth cap', () => {
    // 20 levels deep — comfortably under the 32 cap; should pass.
    let json = '{"leaf":1}'
    for (let i = 0; i < 19; i++) {
      json = `{"a":${json}}`
    }
    expect(() => decodeFilterParam(b64(json))).not.toThrow()
  })
})
