import { getInitialPanelAside, isPanelAsideHidden, setPanelAsideHidden } from '../panelAside'

describe('panel aside persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('remembers the hidden state', () => {
    expect(isPanelAsideHidden()).toBe(false)
    setPanelAsideHidden(true)
    expect(isPanelAsideHidden()).toBe(true)
    setPanelAsideHidden(false)
    expect(isPanelAsideHidden()).toBe(false)
  })

  it('hides the default aside when the user closed it before', () => {
    expect(getInitialPanelAside(true, false, true)).toBe(false)
    expect(getInitialPanelAside(true, false, false)).toBe(true)
  })

  it('keeps explicitly requested and custom asides', () => {
    expect(getInitialPanelAside(false, false, false)).toBe(false)
    expect(getInitialPanelAside('history', true, true)).toBe('history')
    expect(getInitialPanelAside(true, true, true)).toBe(true)
  })
})
