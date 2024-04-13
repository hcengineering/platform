import { type IntlString } from '@hcengineering/platform'
import { writable } from 'svelte/store'
import type { AnyComponent, AnySvelteComponent, LabelAndProps, TooltipAlignment } from './types'

/**
 * @typedef LabelAndProps
 * 
 * Represents an empty tooltip.
 */
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

/**
 * @typedef LabelAndProps
 * 
 * Represents the current tooltip.
 */
let storedValue: LabelAndProps = emptyTooltip

/**
 * @typedef writable<LabelAndProps>
 * 
 * Represents a writable store for the tooltip.
 */
export const tooltipstore = writable<LabelAndProps>(emptyTooltip)

let toHandler: any

/**
 * @function tooltip
 * 
 * Creates a tooltip for a given HTML element with optional properties. 
 * Returns an object with methods to update or destroy the tooltip.
 * 
 * @param {HTMLElement} node - The HTML element to attach the tooltip to.
 * @param {LabelAndProps} options - The options for the tooltip.
 * @returns {any} - An object with update and destroy methods.
 */
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

/**
 * @function showTooltip
 * 
 * Displays a tooltip with the given parameters. Updates the stored value and the tooltip store with the new tooltip information.
 * 
 * @param label - The label for the tooltip.
 * @param element - The HTML element to attach the tooltip to.
 * @param direction - The direction of the tooltip.
 * @param component - The component for the tooltip.
 * @param props - The properties for the tooltip.
 * @param anchor - The anchor for the tooltip.
 * @param onUpdate - The update function for the tooltip.
 * @param kind - The kind of the tooltip.
 * @param keys - The keys for the tooltip.
 */
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
