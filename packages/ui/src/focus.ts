import { getContext, onDestroy, setContext } from 'svelte'

/**
 * @public
 */
export interface FocusManager {
  next: (inc?: 1 | -1) => void
  setFocus: (idx: number) => void
  setFocusPos: (order: number) => void
  updateFocus: (idx: number, order: number) => void

  // Check if current manager has focus
  hasFocus: () => boolean
}

class FocusManagerImpl implements FocusManager {
  counter = 0
  elements: Array<{
    id: number
    order: number
    focus: () => boolean
    isFocus: () => boolean
    canBlur?: () => boolean
  }> = []

  current = 0
  register (order: number, focus: () => boolean, isFocus: () => boolean, canBlur?: () => boolean): number {
    const el = { id: this.counter++, order, focus, isFocus, canBlur }
    this.elements.push(el)
    this.sort()
    return el.id
  }

  unregister (idx: number): void {
    this.elements = this.elements.filter((it) => it.id !== idx)
    this.sort()
  }

  sort (): void {
    // this.needSort = 0
    this.elements.sort((a, b) => {
      return a.order - b.order
    })
  }

  next (inc?: 1 | -1): void {
    const current = this.elements[this.current]
    if (!(current?.canBlur?.() ?? true)) {
      return
    }
    while (true) {
      this.current = this.current + (inc ?? 1)
      if (this.elements[Math.abs(this.current) % this.elements.length].focus()) {
        return
      }
    }
  }

  setFocus (idx: number): void {
    if (idx === -1) {
      return
    }
    this.current = this.elements.findIndex((it) => it.id === idx) ?? 0
    this.elements[Math.abs(this.current) % this.elements.length].focus()
  }

  setFocusPos (order: number): void {
    if (order === -1) {
      return
    }
    const idx = this.elements.findIndex((it) => it.order === order)
    if (idx !== undefined) {
      this.current = idx
      this.elements[Math.abs(this.current) % this.elements.length].focus()
    }
  }

  updateFocus (idx: number, order: number): void {
    const el = this.elements.find((it) => it.id === idx)
    if (el !== undefined) {
      if (el.order !== order) {
        el.order = order
        this.sort()
      }
    }
  }

  hasFocus (): boolean {
    for (const el of this.elements) {
      if (el.isFocus()) {
        return true
      }
    }
    return false
  }
}

/**
 * @public
 */
export function createFocusManager (): FocusManager {
  const mgr = new FocusManagerImpl()
  setFocusManager(mgr)
  return mgr
}

export function setFocusManager (manager: FocusManager): void {
  setContext('ui.focus.elements', manager)
}

/**
 * @public
 */
export function getFocusManager (): FocusManager | undefined {
  return getContext('ui.focus.elements')
}

/**
 * Register new focus reciever if order !== -1
 * @public
 */
export function registerFocus (
  order: number,
  item: { focus: () => boolean, isFocus: () => boolean, canBlur?: () => boolean }
): { idx: number, focusManager?: FocusManager } {
  const focusManager = getFocusManager() as FocusManagerImpl
  if (order === -1) {
    return { idx: -1, focusManager }
  }
  const idx = focusManager?.register(order, item.focus, item.isFocus, item.canBlur) ?? -1
  if (idx !== -1) {
    onDestroy(() => {
      focusManager.unregister(idx)
    })
  }
  return { idx, focusManager }
}
