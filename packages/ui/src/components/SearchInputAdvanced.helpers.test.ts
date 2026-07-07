import { reconcilePropValue } from './SearchInputAdvanced.helpers'

describe('reconcilePropValue', () => {
  // C1 core: parent passes stable value='' while user types 'f'.
  // The prop did NOT change (lastProp === '' === propValue), so the
  // user's local edit MUST survive.
  it('keeps the local edit when the prop value is unchanged', () => {
    const r = reconcilePropValue('', '', 'f')
    expect(r.value).toBe('f')
    expect(r.lastProp).toBe('')
  })

  // A real prop change (route/space switch resets searchRaw) DOES override.
  it('adopts a genuinely changed prop value', () => {
    const r = reconcilePropValue('newquery', 'oldquery', 'user-typed')
    expect(r.value).toBe('newquery')
    expect(r.lastProp).toBe('newquery')
  })

  // undefined prop never clobbers local state.
  it('never overwrites local state from an undefined prop', () => {
    const r = reconcilePropValue(undefined, 'prev', 'typed')
    expect(r.value).toBe('typed')
    expect(r.lastProp).toBe(undefined)
  })

  // First bind: prop '' equals initial lastProp '' → local (also '') kept.
  it('is a no-op on the initial empty binding', () => {
    const r = reconcilePropValue('', '', '')
    expect(r.value).toBe('')
  })
})
