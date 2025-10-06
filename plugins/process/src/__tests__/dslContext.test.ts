import { createDSLContext, parseDSLContext } from '../dslContext'

describe('dslContext roundtrip', () => {
  test('attribute', () => {
    const original = { type: 'attribute', key: 'name' } as any
    const dsl = createDSLContext(original)
    const parsed = parseDSLContext(dsl)
    expect(parsed).toEqual(expect.objectContaining({ type: 'attribute', key: 'name' }))
  })

  test('nested', () => {
    const original = { type: 'nested', path: 'owner', key: 'id' } as any
    const dsl = createDSLContext(original)
    const parsed = parseDSLContext(dsl)
    expect(parsed).toEqual(expect.objectContaining({ type: 'nested', path: 'owner', key: 'id' }))
  })

  test('const number and string', () => {
    const originalNum = { type: 'const', value: 42, key: 'answer' } as any
    const dslNum = createDSLContext(originalNum)
    const parsedNum = parseDSLContext(dslNum)
    expect(parsedNum).toEqual(expect.objectContaining({ type: 'const', key: 'answer', value: 42 }))

    const originalStr = { type: 'const', value: 'he"llo', key: 'greet' } as any
    const dslStr = createDSLContext(originalStr)
    const parsedStr = parseDSLContext(dslStr)
    expect(parsedStr).toEqual(expect.objectContaining({ type: 'const', key: 'greet', value: 'he"llo' }))
  })

  test('array const', () => {
    const original = { type: 'const', value: [1, 2, 3], key: 'arr' } as any
    const dsl = createDSLContext(original)
    const parsed = parseDSLContext(dsl)
    expect(parsed).toEqual(expect.objectContaining({ type: 'const', key: 'arr', value: [1, 2, 3] }))
  })

  test('function as primary', () => {
    const original = { type: 'function', func: 'myFunc' as any, props: { a: 1 }, key: '' } as any
    const dsl = createDSLContext(original)
    const parsed = parseDSLContext(dsl)
    expect((parsed as any).type).toBe('function')
    expect((parsed as any).func).toBeDefined()
  })

  test('modifiers SOURCE and FALLBACK and extra function', () => {
    const original = {
      type: 'attribute',
      key: 'x',
      sourceFunction: { func: 'src' as any, props: { p: 'v' } },
      functions: [{ func: 'f1' as any, props: {} }],
      fallbackValue: 10
    } as any
    const dsl = createDSLContext(original)
    const parsed = parseDSLContext(dsl)
    expect(parsed).toBeDefined()
    expect((parsed as any).sourceFunction).toBeDefined()
    expect((parsed as any).fallbackValue).toBe(10)
    expect((parsed as any).functions?.length).toBeGreaterThanOrEqual(1)
  })

  test('nested template with arrow inside should not split modifiers', () => {
    // eslint-disable-next-line no-template-curly-in-string
    const dsl = '${@x=>MYFUNC(${@inner=>OTHER()})=>FALLBACK(1)}'
    const parsed = parseDSLContext(dsl)
    expect(parsed).toBeDefined()
    expect((parsed as any).type).toBe('attribute')
    expect((parsed as any).key).toBe('x')
    expect((parsed as any).functions?.length).toBeGreaterThanOrEqual(1)
    expect((parsed as any).fallbackValue).toBe(1)
  })
})
