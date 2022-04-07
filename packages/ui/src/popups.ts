import { AnySvelteComponent, AnyComponent, PopupAlignment } from './types'
import { getResource } from '@anticrm/platform'
import { writable } from 'svelte/store'

interface CompAndProps {
  id: string
  is: AnySvelteComponent
  props: any
  element?: PopupAlignment
  onClose?: (result: any) => void
  onUpdate?: (result: any) => void
  close: () => void
}

export const popupstore = writable<CompAndProps[]>([])
function addPopup (props: CompAndProps): void {
  popupstore.update((popups) => {
    popups.push(props)
    return popups
  })
}
let popupId: number = 0
export function showPopup (
  component: AnySvelteComponent | AnyComponent,
  props: any,
  element?: PopupAlignment,
  onClose?: (result: any) => void,
  onUpdate?: (result: any) => void
): () => void {
  const id = `${popupId++}`
  const closePopupOp = (): void => {
    popupstore.update((popups) => {
      const pos = popups.findIndex(p => p.id === id)
      if (pos !== -1) {
        popups.splice(pos, 1)
      }
      return popups
    })
  }
  if (typeof component === 'string') {
    getResource(component).then((resolved) => addPopup({ id, is: resolved, props, element, onClose, onUpdate, close: closePopupOp })).catch((err) => console.log(err))
  } else {
    addPopup({ id, is: component, props, element, onClose, onUpdate, close: closePopupOp })
  }
  return closePopupOp
}

export function closePopup (): void {
  popupstore.update((popups) => {
    popups.pop()
    return popups
  })
}

interface IDatePopup {
  component: AnySvelteComponent | undefined
  currentDate: Date | undefined
  anchor: HTMLElement | undefined
  popup: HTMLElement | undefined
  frendlyFocus: HTMLElement[] | undefined
  onClose?: (result: any) => void
  onChange?: (result: any) => void
}

export const dpstore = writable<IDatePopup>({
  component: undefined,
  currentDate: undefined,
  anchor: undefined,
  popup: undefined,
  frendlyFocus: undefined,
  onClose: undefined,
  onChange: undefined
})

export function showDatePopup (
  component: AnySvelteComponent | undefined,
  currentDate: Date,
  anchor?: HTMLElement,
  popup?: HTMLElement,
  frendlyFocus?: HTMLElement[] | undefined,
  onClose?: (result: any) => void,
  onChange?: (result: any) => void
): void {
  dpstore.set({
    component: component,
    currentDate: currentDate,
    anchor: anchor,
    popup: popup,
    frendlyFocus: frendlyFocus,
    onClose: onClose,
    onChange: onChange
  })
}

export function closeDatePopup (): void {
  dpstore.set({
    component: undefined,
    currentDate: undefined,
    anchor: undefined,
    popup: undefined,
    frendlyFocus: undefined,
    onClose: undefined,
    onChange: undefined
  })
}
