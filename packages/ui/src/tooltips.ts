import { AnySvelteComponent, AnyComponent, LabelAndProps, TooltipAligment } from './types'
import { IntlString } from '@anticrm/platform'
import { writable } from 'svelte/store'

export const tooltipstore = writable<LabelAndProps>({
  label: undefined,
  element: undefined,
  direction: undefined,
  component: undefined,
  props: undefined,
  anchor: undefined
})

export function showTooltip (
  label: IntlString | undefined,
  element: HTMLElement,
  direction?: TooltipAligment,
  component?: AnySvelteComponent | AnyComponent,
  props?: any,
  anchor?: HTMLElement
): void {
  tooltipstore.set({
    label: label,
    element: element,
    direction: direction,
    component: component,
    props: props,
    anchor: anchor
  })
}

export function closeTooltip (): void {
  tooltipstore.set({
    label: undefined,
    element: undefined,
    direction: undefined,
    component: undefined,
    props: undefined,
    anchor: undefined
  })
}
