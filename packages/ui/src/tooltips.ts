import { IntlString } from '@anticrm/platform'
import { writable } from 'svelte/store'
import { AnyComponent, AnySvelteComponent, LabelAndProps, TooltipAlignment } from './types'

const emptyTooltip: LabelAndProps = {
  label: undefined,
  element: undefined,
  direction: undefined,
  component: undefined,
  props: undefined,
  anchor: undefined,
  onUpdate: undefined
}
export const tooltipstore = writable<LabelAndProps>(emptyTooltip)

export function showTooltip (
  label: IntlString | undefined,
  element: HTMLElement,
  direction?: TooltipAlignment,
  component?: AnySvelteComponent | AnyComponent,
  props?: any,
  anchor?: HTMLElement,
  onUpdate?: (result: any) => void
): void {
  tooltipstore.set({
    label: label,
    element: element,
    direction: direction,
    component: component,
    props: props,
    anchor: anchor,
    onUpdate: onUpdate
  })
}

export function closeTooltip (): void {
  tooltipstore.set(emptyTooltip)
}
