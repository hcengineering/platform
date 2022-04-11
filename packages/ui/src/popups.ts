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

/**
 * @public
 *
 * Place element based on position and underline content element.
 *
 * return boolean to show or not modal overlay.
 */
export function fitPopupElement (modalHTML: HTMLElement, element?: PopupAlignment, contentPanel?: HTMLElement): boolean {
  let show = true
  if (element != null) {
    show = false
    modalHTML.style.left = modalHTML.style.right = modalHTML.style.top = modalHTML.style.bottom = ''
    modalHTML.style.maxHeight = modalHTML.style.height = ''
    if (typeof element !== 'string') {
      const el = element as HTMLElement
      const rect = el.getBoundingClientRect()
      const rectPopup = modalHTML.getBoundingClientRect()
      // Vertical
      if (rect.bottom + rectPopup.height + 28 <= document.body.clientHeight) {
        modalHTML.style.top = `calc(${rect.bottom}px + .75rem)`
      } else if (rectPopup.height + 28 < rect.top) {
        modalHTML.style.bottom = `calc(${document.body.clientHeight - rect.y}px + .75rem)`
      } else {
        modalHTML.style.top = modalHTML.style.bottom = '1rem'
      }

      // Horizontal
      if (rect.left + rectPopup.width + 16 > document.body.clientWidth) {
        modalHTML.style.right = `${document.body.clientWidth - rect.right}px`
      } else {
        modalHTML.style.left = `${rect.left}px`
      }
    } else if (element === 'right' && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      modalHTML.style.top = `calc(${rect.top}px + 0.5rem)`
      modalHTML.style.bottom = '0.75rem'
      modalHTML.style.right = '0.75rem'
      show = true
    } else if (element === 'top') {
      modalHTML.style.top = '15vh'
      modalHTML.style.left = '50%'
      modalHTML.style.transform = 'translateX(-50%)'
      show = true
    } else if (element === 'account') {
      modalHTML.style.bottom = '2.75rem'
      modalHTML.style.left = '5rem'
    } else if (element === 'full' && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      modalHTML.style.top = `calc(${rect.top}px + 0.25rem)`
      modalHTML.style.bottom = '0.25rem'
      modalHTML.style.left = '0.25rem'
      modalHTML.style.right = '0.25rem'
      show = true
    } else if (element === 'content' && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      modalHTML.style.top = `calc(${rect.top}px)`
      modalHTML.style.height = `${rect.height}px`
      modalHTML.style.left = `calc(${rect.left}px)`
      modalHTML.style.width = `${rect.width}px`
    } else if (element === 'middle') {
      if (contentPanel !== undefined) {
        const rect = contentPanel.getBoundingClientRect()
        modalHTML.style.top = `calc(${rect.top}px)`
      } else {
        modalHTML.style.top = '15%'
      }
      modalHTML.style.bottom = '0.75rem'
      modalHTML.style.left = '50%'
      modalHTML.style.transform = 'translateX(-50%)'
    }
  } else {
    modalHTML.style.top = '50%'
    modalHTML.style.left = '50%'
    modalHTML.style.transform = 'translate(-50%, -50%)'
    show = true
  }
  return show
}
