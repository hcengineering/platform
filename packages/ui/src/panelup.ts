import { writable } from 'svelte/store'
import { getCurrentLocation, location, navigate } from './location'
import { AnyComponent, PopupAlignment } from './types'

export interface PanelProps {
  component: AnyComponent
  _id: string
  _class: string
  element?: PopupAlignment
  rightSection?: AnyComponent
}

export const panelstore = writable<{ panel?: PanelProps | undefined }>({ panel: undefined })
let currentLocation: string | undefined

location.subscribe((loc) => {
  if (loc.fragment !== currentLocation && loc.fragment !== undefined && loc.fragment.trim().length > 0) {
    const props = decodeURIComponent(loc.fragment).split('|')

    if (props.length >= 3) {
      showPanel(
        props[0] as AnyComponent,
        props[1],
        props[2],
        (props[3] ?? undefined) as PopupAlignment,
        (props[4] ?? undefined) as AnyComponent
      )
    }
  } else if (
    (loc.fragment === undefined || (loc.fragment !== undefined && loc.fragment.trim().length === 0)) &&
    currentLocation !== undefined
  ) {
    closePanel()
  }
})

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
  const location = getCurrentLocation()
  if (location.fragment !== currentLocation) {
    location.fragment = currentLocation
    navigate(location)
  }
}

export function closePanel (): void {
  panelstore.update(() => {
    return { panel: undefined }
  })
  const location = getCurrentLocation()
  location.fragment = undefined
  currentLocation = undefined
  navigate(location)
}
