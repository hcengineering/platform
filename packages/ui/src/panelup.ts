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

export const panelstore = writable < {panel?: PanelProps|undefined}>({ panel: undefined })
let currentLocation: string | undefined

location.subscribe((loc) => {
  if (loc.fragment !== currentLocation && loc.fragment !== undefined && loc.fragment.trim().length > 0) {
    const props = decodeURIComponent(loc.fragment).split('|')
    showPanel(props[0] as AnyComponent, props[1], props[2], 'full')
  }
})

export function showPanel (
  component: AnyComponent,
  _id: string,
  _class: string,
  element?: PopupAlignment,
  rightSection?: AnyComponent
): void {
  const newLoc = encodeURIComponent([component, _id, _class].join('|'))
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
