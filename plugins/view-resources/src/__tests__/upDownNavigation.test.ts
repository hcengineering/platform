import { getUpDownNavigationOffset } from '../upDownNavigation'

function key (
  k: string,
  mods: Partial<{
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    defaultPrevented: boolean
  }> = {}
): Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'defaultPrevented'> {
  return { key: k, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, defaultPrevented: false, ...mods }
}

describe('getUpDownNavigationOffset', () => {
  it('maps Alt+ArrowUp / Alt+ArrowDown to previous / next', () => {
    expect(getUpDownNavigationOffset(key('ArrowUp', { altKey: true }))).toBe(-1)
    expect(getUpDownNavigationOffset(key('ArrowDown', { altKey: true }))).toBe(1)
  })

  it('ignores arrows without Alt or with other modifiers', () => {
    expect(getUpDownNavigationOffset(key('ArrowUp'))).toBeUndefined()
    expect(getUpDownNavigationOffset(key('ArrowDown', { altKey: true, shiftKey: true }))).toBeUndefined()
    expect(getUpDownNavigationOffset(key('ArrowDown', { altKey: true, ctrlKey: true }))).toBeUndefined()
    expect(getUpDownNavigationOffset(key('ArrowDown', { altKey: true, metaKey: true }))).toBeUndefined()
  })

  it('ignores other keys and already handled events', () => {
    expect(getUpDownNavigationOffset(key('ArrowLeft', { altKey: true }))).toBeUndefined()
    expect(getUpDownNavigationOffset(key('ArrowDown', { altKey: true, defaultPrevented: true }))).toBeUndefined()
  })

  it('ignores the shortcut while editing text', () => {
    const evt = key('ArrowDown', { altKey: true })
    expect(getUpDownNavigationOffset(evt, { tagName: 'INPUT' })).toBeUndefined()
    expect(getUpDownNavigationOffset(evt, { tagName: 'TEXTAREA' })).toBeUndefined()
    expect(getUpDownNavigationOffset(evt, { tagName: 'DIV', isContentEditable: true })).toBeUndefined()
    expect(getUpDownNavigationOffset(evt, { tagName: 'DIV', isContentEditable: false })).toBe(1)
    expect(getUpDownNavigationOffset(evt, { tagName: 'BUTTON' })).toBe(1)
    expect(getUpDownNavigationOffset(evt, null)).toBe(1)
  })
})
