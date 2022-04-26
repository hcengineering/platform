import type { AnySvelteComponent, AnyComponent, PopupAlignment, PopupPositionElement } from './types'
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
      const pos = popups.findIndex((p) => p.id === id)
      if (pos !== -1) {
        popups.splice(pos, 1)
      }
      return popups
    })
  }
  if (typeof component === 'string') {
    getResource(component)
      .then((resolved) => addPopup({ id, is: resolved, props, element, onClose, onUpdate, close: closePopupOp }))
      .catch((err) => console.log(err))
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
 * Place element based on position and element.
 *
 * return boolean to show or not modal overlay.
 */
export function fitPopupPositionedElement (modalHTML: HTMLElement, alignment: PopupPositionElement, newProps: Record<string, string|number>): boolean {
  const rect = alignment.getBoundingClientRect()
  const rectPopup = modalHTML.getBoundingClientRect()
  newProps.left = newProps.right = newProps.top = newProps.bottom = ''
  newProps.maxHeight = newProps.height = ''
  newProps.maxWidth = newProps.width = ''
  if (alignment.position !== undefined) {
    if (alignment.position.v === 'top') {
      newProps.top = `${rect.top}px`
    } else if (alignment.position.v === 'bottom') {
      newProps.top = `${rect.bottom - rectPopup.height}px`
    }

    if (alignment.position.h === 'right') {
      newProps.left = `calc(${rect.right}px + .125rem)`
    } else if (alignment.position.h === 'left') {
      newProps.left = `calc(${rect.left - rectPopup.width}px - .125rem)`
    }
  } else {
    // Vertical
    if (rect.bottom + rectPopup.height + 28 <= document.body.clientHeight) {
      newProps.top = `${rect.bottom + 1}px`
    } else if (rectPopup.height + 28 < rect.top) {
      newProps.bottom = `${document.body.clientHeight - rect.top + 1}px`
    } else {
      newProps.top = modalHTML.style.bottom = '1rem'
    }

    // Horizontal
    if (rect.left + rectPopup.width + 16 > document.body.clientWidth) {
      newProps.right = `${document.body.clientWidth - rect.right}px`
    } else {
      newProps.left = `${rect.left}px`
    }
  }
  return false
}

function applyStyle (values: Record<string, string| number>, modalHTML: HTMLElement): void {
  for (const [k, v] of Object.entries(values)) {
    const old = (modalHTML.style as any)[k]
    if (old !== v) {
      (modalHTML.style as any)[k] = v
    }
  }
}

/**
 * @public
 *
 * Place element based on position and underline content element.
 *
 * return boolean to show or not modal overlay.
 */
export function fitPopupElement (modalHTML: HTMLElement, element?: PopupAlignment, contentPanel?: HTMLElement, fullSize?: boolean): boolean {
  let show = true
  const newProps: Record<string, string|number> = {}
  if (element != null) {
    show = false
    newProps.left = newProps.right = newProps.top = newProps.bottom = ''
    newProps.maxHeight = newProps.height = ''
    newProps.maxWidth = newProps.width = ''
    if (typeof element !== 'string') {
      const result = fitPopupPositionedElement(modalHTML, element, newProps)
      applyStyle(newProps, modalHTML)
      return result
    } else if (element === 'right' && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      newProps.top = `calc(${rect.top}px + 0.5rem)`
      newProps.bottom = '0.75rem'
      newProps.right = '0.75rem'
      newProps.maxWidth = '50%'
      show = true
    } else if (element === 'top') {
      newProps.top = '15vh'
      newProps.left = '50%'
      newProps.transform = 'translateX(-50%)'
      show = true
    } else if (element === 'account') {
      newProps.bottom = '2.75rem'
      newProps.left = '5rem'
    } else if ((element === 'full' || (element === 'content' && fullSize === true)) && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      newProps.top = `${rect.top}px`
      newProps.bottom = '0'
      newProps.left = '0'
      newProps.right = '0'
      show = true
      console.log('!!!!!!! Full + Content & FS !!! contentPanel:', contentPanel)
    } else if (element === 'content' && fullSize !== true && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      newProps.top = `${rect.top + 1}px`
      newProps.bottom = `${Math.min(document.body.clientHeight - rect.bottom + 1, window.innerHeight - rect.top - 1)}px`
      // newProps.height = `${Math.min(rect.height, window.innerHeight - rect.top)}px`
      newProps.left = `${rect.left + 1}px`
      newProps.right = `${Math.min(document.body.clientWidth - rect.right, window.innerWidth - rect.left - 1)}px`
      // newProps.width = `${Math.min(rect.width, window.innerWidth - rect.left)}px`
      console.log('!!!!!!! Content & Not FS !!! contentPanel:', contentPanel)
    } else if (element === 'middle') {
      if (contentPanel !== undefined) {
        const rect = contentPanel.getBoundingClientRect()
        newProps.top = `calc(${rect.top}px)`
      } else {
        newProps.top = '15%'
      }
      newProps.bottom = '0.75rem'
      newProps.left = '50%'
      newProps.transform = 'translateX(-50%)'
    }
  } else {
    newProps.top = '50%'
    newProps.left = '50%'
    newProps.transform = 'translate(-50%, -50%)'
    show = true
  }
  applyStyle(newProps, modalHTML)
  return show
}

export function eventToHTMLElement (evt: MouseEvent): HTMLElement {
  return evt.target as HTMLElement
}
