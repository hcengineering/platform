import { getResource } from '@anticrm/platform'
import { writable } from 'svelte/store'
import type {
  AnyComponent,
  AnySvelteComponent,
  HorizontalAlignment,
  PopupAlignment,
  PopupOptions,
  PopupPositionElement,
  VerticalAlignment
} from './types'

interface CompAndProps {
  id: string
  is: AnySvelteComponent
  props: any
  element?: PopupAlignment
  onClose?: (result: any) => void
  onUpdate?: (result: any) => void
  close: () => void
  options: {
    category: string
    overlay: boolean
  }
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
  onUpdate?: (result: any) => void,
  options: {
    category: string
    overlay: boolean
  } = { category: 'popup', overlay: true }
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
      .then((resolved) =>
        addPopup({ id, is: resolved, props, element, onClose, onUpdate, close: closePopupOp, options })
      )
      .catch((err) => console.log(err))
  } else {
    addPopup({ id, is: component, props, element, onClose, onUpdate, close: closePopupOp, options })
  }
  return closePopupOp
}

export function closePopup (category?: string): void {
  popupstore.update((popups) => {
    if (category !== undefined) {
      popups = popups.filter((p) => p.options.category !== category)
    } else {
      popups.pop()
    }
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
  shift?: boolean
}

export const dpstore = writable<IDatePopup>({
  component: undefined,
  currentDate: undefined,
  anchor: undefined,
  popup: undefined,
  frendlyFocus: undefined,
  onClose: undefined,
  onChange: undefined,
  shift: undefined
})

export function showDatePopup (
  component: AnySvelteComponent | undefined,
  currentDate: Date,
  anchor?: HTMLElement,
  popup?: HTMLElement,
  frendlyFocus?: HTMLElement[] | undefined,
  onClose?: (result: any) => void,
  onChange?: (result: any) => void,
  shift?: boolean
): void {
  dpstore.set({
    component: component,
    currentDate: currentDate,
    anchor: anchor,
    popup: popup,
    frendlyFocus: frendlyFocus,
    onClose: onClose,
    onChange: onChange,
    shift: shift
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
    onChange: undefined,
    shift: undefined
  })
}

/**
 * @public
 *
 * Place element based on position and element.
 *
 * return boolean to show or not modal overlay.
 */
export function fitPopupPositionedElement (
  modalHTML: HTMLElement,
  alignment: PopupPositionElement,
  newProps: Record<string, string | number>
): PopupOptions {
  let direction: string = ''
  const rect = alignment.getBoundingClientRect()
  const rectPopup = modalHTML.getBoundingClientRect()
  const docWidth = document.body.clientWidth
  const docHeight = document.body.clientHeight
  newProps.left = newProps.right = newProps.top = newProps.bottom = ''
  newProps.maxHeight = newProps.height = ''
  newProps.maxWidth = newProps.width = ''
  if (alignment?.kind === 'submenu') {
    const dirH =
      docWidth - rect.right - rectPopup.width - 16 > 0 ? 'right' : rect.left > docWidth - rect.right ? 'left' : 'right'
    const dirV =
      docHeight - rect.top - rectPopup.height - 16 > 0
        ? 'bottom'
        : rect.bottom > docHeight - rect.top
          ? 'top'
          : 'bottom'
    if (dirH === 'right') newProps.left = `${rect.right - 4}px`
    else newProps.right = `${docWidth - rect.left - 4}px`
    if (dirV === 'bottom') newProps.top = `${rect.top - 4}px`
    else newProps.bottom = `${docHeight - rect.bottom - 4}px`
  } else if (alignment.position !== undefined) {
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
    direction = alignment.position.v + '|' + alignment.position.h
  } else {
    // Vertical
    if (rect.bottom + rectPopup.height + 28 <= document.body.clientHeight) {
      newProps.top = `${rect.bottom + 1}px`
      direction = 'bottom'
    } else if (rectPopup.height + 28 < rect.top) {
      newProps.bottom = `${document.body.clientHeight - rect.top + 1}px`
      direction = 'top'
    } else {
      newProps.top = modalHTML.style.bottom = '1rem'
      direction = 'top'
    }

    // Horizontal
    if (rect.left + rectPopup.width + 16 <= docWidth) {
      newProps.left = `${rect.left}px`
      direction += '|right'
    } else if (rect.right - rectPopup.width - 16 >= 0) {
      newProps.right = `${docWidth - rect.right}px`
      direction += '|left'
    } else {
      newProps.left = '1rem'
      direction += '|center'
    }
  }
  return { props: newProps, showOverlay: false, direction }
}

/**
 * @public
 *
 * Place element based on position and underline content element.
 *
 * return boolean to show or not modal overlay.
 */
export function fitPopupElement (
  modalHTML: HTMLElement,
  element?: PopupAlignment,
  contentPanel?: HTMLElement
): PopupOptions {
  let show = true
  const newProps: Record<string, string | number> = {}
  if (element != null) {
    show = false
    newProps.left = newProps.right = newProps.top = newProps.bottom = ''
    newProps.maxHeight = newProps.height = ''
    newProps.maxWidth = newProps.width = newProps.minWidth = ''
    if (typeof element !== 'string') {
      const result = fitPopupPositionedElement(modalHTML, element, newProps)
      // applyStyle(newProps, modalHTML)
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
    } else if (element === 'float') {
      newProps.top = 'calc(var(--status-bar-height) + .25rem)'
      newProps.bottom = '.25rem'
      newProps.left = '60%'
      newProps.right = '.25rem'
      show = true
    } else if (element === 'account') {
      newProps.bottom = '2.75rem'
      newProps.left = '5rem'
    } else if (element === 'full' && contentPanel === undefined) {
      newProps.top = '0'
      newProps.bottom = '0'
      newProps.left = '0'
      newProps.right = '0'
      // newProps.width = '100vw'
      newProps.height = '100vh'
      show = false
    } else if (element === 'full' && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      newProps.top = `${rect.top + 1}px`
      newProps.bottom = '.25rem'
      newProps.left = '.25rem'
      newProps.right = '.25rem'
      show = true
    } else if (element === 'content' && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      newProps.top = `${rect.top}px`
      // newProps.bottom = `${Math.min(document.body.clientHeight - rect.bottom + 1, window.innerHeight - rect.top - 1)}px`
      newProps.height = `${Math.min(rect.height, window.innerHeight - rect.top)}px`
      newProps.left = `${rect.left + 1}px`
      // newProps.right = `${Math.min(document.body.clientWidth - rect.right, window.innerWidth - rect.left - 5)}px`
      newProps.width = `${Math.min(rect.width, window.innerWidth - rect.left)}px`
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
  // applyStyle(newProps, modalHTML)
  return { props: newProps, showOverlay: show, direction: '' }
}

export function eventToHTMLElement (evt: MouseEvent): HTMLElement {
  return evt.target as HTMLElement
}

export function getEventPopupPositionElement (
  e?: Event,
  position?: { v: VerticalAlignment, h: HorizontalAlignment }
): PopupAlignment | undefined {
  if (e == null || e.target == null) {
    return undefined
  }
  const target = e.target as HTMLElement
  return getPopupPositionElement(target, position)
}

export function getPopupPositionElement (
  el: HTMLElement | undefined,
  position?: { v: VerticalAlignment, h: HorizontalAlignment }
): PopupAlignment | undefined {
  if (el?.getBoundingClientRect != null) {
    const result = el.getBoundingClientRect()
    return {
      getBoundingClientRect: () => result,
      position
    }
  }

  return undefined
}
export function getEventPositionElement (evt: MouseEvent): PopupAlignment | undefined {
  return {
    getBoundingClientRect: () => DOMRect.fromRect({ width: 1, height: 1, x: evt.clientX, y: evt.clientY })
  }
}
