import { type IntlString } from '@hcengineering/platform'
import { derived } from 'svelte/store'
import type { AnyComponent, AnySvelteComponent, LabelAndProps, TooltipAlignment } from './types'
import { modalStore } from './modals'

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
export const tooltipstore = derived(modalStore, (modals) => {
  if (modals.length === 0) {
    return emptyTooltip
  }
  const tooltip = modals.filter((m) => m?.type === 'tooltip')
  return tooltip.length > 0 ? (tooltip[0] as LabelAndProps) : emptyTooltip
})

let toHandler: any
export function tooltip (node: HTMLElement, options?: LabelAndProps): any {
  if (options === undefined) {
    return {}
  }
  if (options.label === undefined && options.component === undefined) {
    // No tooltip
    return {}
  }
  let opt = options
  const show = (): void => {
    const shown = !!(storedValue.label !== undefined || storedValue.component !== undefined)
    if (!shown) {
      if (opt?.kind !== 'submenu' || opt.timeout !== undefined) {
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
        }, opt.timeout ?? 10)
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
    kind: kind ?? 'tooltip',
    keys,
    type: 'tooltip'
  }
  modalStore.update((old) => {
    const tooltip = old.find((m) => m?.type === 'tooltip') as LabelAndProps | undefined
    if (tooltip !== undefined && tooltip.component === storedValue.component) {
      if (tooltip.kind !== undefined && storedValue.kind === undefined) {
        storedValue.kind = tooltip.kind
      }
      if (storedValue.kind === undefined) {
        storedValue.kind = 'tooltip'
      }
    }
    old.push(storedValue)
    return old
  })
}

export function closeTooltip (): void {
  clearTimeout(toHandler)
  storedValue = emptyTooltip
  modalStore.update((old) => {
    old = old.filter((m) => m?.type !== 'tooltip')
    return old
  })
}
