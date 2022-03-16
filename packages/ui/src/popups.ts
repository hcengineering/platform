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
