import { writable } from 'svelte/store'
import { getLocation, navigate } from './location'
import { type AnyComponent, type PopupAlignment } from './types'

export interface PanelProps {
  component: AnyComponent
  _id: string
  _class: string
  element?: PopupAlignment
  rightSection?: AnyComponent
  refit?: () => void
}

export const panelstore = writable<{
  panel?: PanelProps | undefined
}>({ panel: undefined })
let currentLocation: string | undefined

export function getPanelURI (component: AnyComponent, _id: string, _class: string, element?: PopupAlignment): string {
  const panelProps = [component, _id, _class]
  if (typeof element === 'string') {
    panelProps.push(element)
  }
  return encodeURIComponent(panelProps.join('|'))
}

export function showPanel (
  component: AnyComponent,
  _id: string,
  _class: string,
  element?: PopupAlignment,
  rightSection?: AnyComponent,
  doNavigate: boolean = true
): void {
  openPanel(component, _id, _class, element, rightSection)
  const loc = getLocation()
  if (doNavigate && loc.fragment !== currentLocation) {
    loc.fragment = currentLocation
    navigate(loc)
  }
}

function openPanel (
  component: AnyComponent,
  _id: string,
  _class: string,
  element?: PopupAlignment,
  rightSection?: AnyComponent
): void {
  const newLoc = getPanelURI(component, _id, _class, element)
  if (currentLocation === newLoc) {
    return
  }
  currentLocation = newLoc
  panelstore.update(() => {
    return { panel: { component, _id, _class, element, rightSection } }
  })
}

export function closePanel (shouldRedirect: boolean = true): void {
  currentLocation = undefined
  panelstore.update(() => {
    return { panel: undefined }
  })
  if (shouldRedirect) {
    const loc = getLocation()
    loc.fragment = undefined
    navigate(loc)
  }
}
