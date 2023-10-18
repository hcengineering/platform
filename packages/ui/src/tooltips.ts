import { IntlString } from '@hcengineering/platform'
import { writable } from 'svelte/store'
import type { AnyComponent, AnySvelteComponent, LabelAndProps, TooltipAlignment } from './types'

const emptyTooltip: LabelAndProps = {
  label: undefined,
  element: undefined,
  direction: undefined,
  component: undefined,
  props: undefined,
  anchor: undefined,
  onUpdate: undefined,
  keys: undefined,
  kind: 'tooltip'
}
let storedValue: LabelAndProps = emptyTooltip
export const tooltipstore = writable<LabelAndProps>(emptyTooltip)

let toHandler: any
export function tooltip (node: HTMLElement, options?: LabelAndProps): any {
  if (options === undefined) {
    return {}
  }
  let opt = options
  const show = (): void => {
    const shown = !!(storedValue.label !== undefined || storedValue.component !== undefined)
    if (!shown) {
      if (opt?.kind !== 'submenu') {
        clearTimeout(toHandler)
        toHandler = setTimeout(() => {
          showTooltip(
            opt.label,
            node,
            opt.direction,
            opt.component,
            opt.props,
            opt.anchor,
            opt.onUpdate,
            opt.kind,
            opt.keys
          )
        }, 250)
      } else {
        showTooltip(
          opt.label,
          node,
          opt.direction,
          opt.component,
          opt.props,
          opt.anchor,
          opt.onUpdate,
          opt.kind,
          opt.keys
        )
      }
    }
  }
  const hide = (): void => {
    clearTimeout(toHandler)
  }
  node.addEventListener('mouseleave', hide)
  node.addEventListener('mousemove', show)
  return {
    update (options: LabelAndProps) {
      opt = options
      if (node !== storedValue.element) return
      const shown = !!(storedValue.label !== undefined || storedValue.component !== undefined)
      if (shown) {
        showTooltip(
          opt.label,
          node,
          opt.direction,
          opt.component,
          opt.props,
          opt.anchor,
          opt.onUpdate,
          opt.kind,
          opt.keys
        )
      }
    },

    destroy () {
      node.removeEventListener('mousemove', show)
      node.removeEventListener('mouseleave', hide)
    }
  }
}

export function showTooltip (
  label: IntlString | undefined,
  element: HTMLElement,
  direction?: TooltipAlignment,
  component?: AnySvelteComponent | AnyComponent,
  props?: any,
  anchor?: HTMLElement,
  onUpdate?: (result: any) => void,
  kind?: 'tooltip' | 'submenu' | 'popup',
  keys?: string[]
): void {
  storedValue = {
    label,
    element,
    direction,
    component,
    props,
    anchor,
    onUpdate,
    kind,
    keys
  }
  tooltipstore.update((old) => {
    if (old.component === storedValue.component) {
      if (old.kind !== undefined && storedValue.kind === undefined) {
        storedValue.kind = old.kind
      }
      if (storedValue.kind === undefined) {
        storedValue.kind = 'tooltip'
      }
    }
    return storedValue
  })
}

export function closeTooltip (): void {
  clearTimeout(toHandler)
  storedValue = emptyTooltip
  tooltipstore.set(emptyTooltip)
}
