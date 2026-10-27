import { readable } from 'svelte/store'
export { default as Button } from './Button.svelte'
export { default as Label } from './Label.svelte'
export { default as Scroller } from './Scroller.svelte'
export { default as EditBox } from './EditBox.svelte'
export { default as IconClose, default as IconBack, default as ToggleWithLabel } from './Empty.svelte'

export const deviceOptionsStore = readable({ isMobile: false })
export const nextFocus = jest.fn()
export function getFocusManager (): { next: typeof nextFocus } {
  return { next: nextFocus }
}
export function resizeObserver (): void {}
