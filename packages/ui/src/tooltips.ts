import { AnySvelteComponent, AnyComponent, LabelAndProps, TooltipAlignment } from './types'
import { IntlString } from '@anticrm/platform'
import { writable } from 'svelte/store'

export const tooltipstore = writable<LabelAndProps>({
  label: undefined,
  element: undefined,
  direction: undefined,
  component: undefined,
  props: undefined,
  anchor: undefined,
  onUpdate: undefined
})

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
  tooltipstore.set({
    label: undefined,
    element: undefined,
    direction: undefined,
    component: undefined,
    props: undefined,
    anchor: undefined,
    onUpdate: undefined
  })
}
