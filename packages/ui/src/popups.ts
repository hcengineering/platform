import { getResource } from '@hcengineering/platform'
import { ComponentType } from 'svelte'
import { writable } from 'svelte/store'
import type {
  AnyComponent,
  AnySvelteComponent,
  HorizontalAlignment,
  PopupAlignment,
  PopupOptions,
  PopupPositionElement,
  VerticalAlignment,
  DeviceOptions
} from './types'

export interface CompAndProps {
  id: string
  is: AnySvelteComponent | ComponentType
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

export interface PopupResult {
  id: string
  close: () => void
}

export const popupstore = writable<CompAndProps[]>([])

export function updatePopup (id: string, props: Partial<CompAndProps>): void {
  popupstore.update((popups) => {
    const popupIndex = popups.findIndex((p) => p.id === id)
    if (popupIndex !== -1) {
      popups[popupIndex] = { ...popups[popupIndex], ...props }
    }
    return popups
  })
}

function addPopup (props: CompAndProps): void {
  popupstore.update((popups) => {
    popups.push(props)
    return popups
  })
}
let popupId: number = 0
export function showPopup (
  component: AnySvelteComponent | AnyComponent | ComponentType,
  props: any,
  element?: PopupAlignment,
  onClose?: (result: any) => void | Promise<void>,
  onUpdate?: (result: any) => void | Promise<void>,
  options: {
    category: string
    overlay: boolean
  } = { category: 'popup', overlay: true }
): PopupResult {
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
  const _element = element instanceof HTMLElement ? getPopupPositionElement(element) : element
  if (typeof component === 'string') {
    getResource(component)
      .then((resolved) =>
        addPopup({ id, is: resolved, props, element: _element, onClose, onUpdate, close: closePopupOp, options })
      )
      .catch((err) => console.log(err))
  } else {
    addPopup({ id, is: component, props, element: _element, onClose, onUpdate, close: closePopupOp, options })
  }
  return {
    id,
    close: closePopupOp
  }
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
      docWidth - rect.right - rectPopup.width - 12 > 0 ? 'right' : rect.left > docWidth - rect.left ? 'left' : 'inside'
    const dirV =
      docHeight - rect.top - rectPopup.height - 20 > 0
        ? 'bottom'
        : rect.bottom > rectPopup.height + 20
          ? 'top'
          : 'bottom'
    if (dirH === 'right') newProps.left = `${rect.right - 4}px`
    else if (dirH === 'inside') newProps.right = '1rem'
    else newProps.right = `${docWidth - rect.left - 4}px`
    if (dirV === 'bottom') newProps.top = `${rect.top - 4}px`
    else newProps.bottom = `${docHeight - rect.bottom - 4}px`
    direction = `${dirV}|${dirH}`
  } else if (alignment.position !== undefined) {
    if (alignment.position.v === 'top') {
      newProps.top = `${rect.top}px`
    } else if (alignment.position.v === 'bottom') {
      newProps.top = `${rect.bottom - rectPopup.height}px`
    }

    if (alignment.position.h === 'right') {
      newProps.left = `${rect.right + 4}px`
    } else if (alignment.position.h === 'left') {
      newProps.left = `${rect.left - rectPopup.width - 4}px`
    }
    direction = alignment.position.v + '|' + alignment.position.h
  } else {
    // Vertical
    if (rect.bottom + rectPopup.height + 28 <= docHeight) {
      newProps.top = `${rect.bottom + 16}px`
      direction = 'bottom'
    } else if (rectPopup.height + 28 < rect.top) {
      newProps.bottom = `${docHeight - rect.top + 16}px`
      direction = 'top'
    } else {
      newProps.top = newProps.bottom = '16px'
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
      newProps.left = '16px'
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
  device: DeviceOptions,
  element?: PopupAlignment,
  contentPanel?: HTMLElement,
  clientWidth?: number,
  clientHeight?: number
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
      newProps.top = `calc(${rect.top}px + 8px)`
      newProps.bottom = '0.75rem'
      newProps.right = '0.75rem'
      newProps.maxWidth = '50%'
      show = true
    } else if (element === 'top') {
      const fullHeight = clientHeight !== undefined && clientHeight / device.docHeight > 0.745
      if (clientWidth !== undefined && clientHeight !== undefined) {
        newProps.left = `calc(50% - ${clientWidth / 2}px`
      } else {
        newProps.left = '50%'
        newProps.transform = 'translateX(-50%)'
      }
      newProps.top = fullHeight ? `${(device.docHeight - clientHeight) / 2}px` : '15vh'
      newProps.maxHeight = fullHeight ? 'calc(100vh - 2rem)' : '75vh'
      show = true
    } else if (element === 'float') {
      newProps.top = 'calc(var(--status-bar-height) + 4px)'
      newProps.bottom = '4px'
      newProps.left = '60%'
      newProps.right = '4px'
      show = true
    } else if (element === 'center') {
      if (clientWidth !== undefined && clientHeight !== undefined) {
        newProps.top = `calc(50% - ${clientHeight / 2}px`
        newProps.left = `calc(50% - ${clientWidth / 2}px`
      } else {
        newProps.top = '50%'
        newProps.left = '50%'
        newProps.transform = 'translate(-50%, -50%)'
      }
      show = true
    } else if (element === 'centered') {
      newProps.top = newProps.bottom = '15%'
      newProps.left = newProps.right = '25%'
      show = true
    } else if (element === 'logo') {
      newProps.top = '2.75rem'
      newProps.left = '5rem'
      newProps.maxWidth = '42rem'
      newProps.maxHeight = 'calc(100vh - 5.5rem)'
      show = true
    } else if (element === 'logo-mini') {
      newProps.top = '2.5rem'
      newProps.left = '.5rem'
      newProps.maxWidth = '42rem'
      newProps.maxHeight = 'calc(100vh - 5.5rem)'
      show = true
    } else if (element === 'logo-portrait') {
      newProps.bottom = 'calc(var(--app-panel-width) + .75rem)'
      newProps.left = '.5rem'
      newProps.maxWidth = 'calc(100vw - 1rem)'
      newProps.maxHeight = 'calc(100vh - var(--app-panel-width) - 1.5rem)'
      show = true
    } else if (element === 'account') {
      newProps.bottom = '2.75rem'
      newProps.left = '5rem'
      newProps.maxWidth = '42rem'
      newProps.maxHeight = 'calc(100vh - 5.5rem)'
      show = true
    } else if (element === 'account-portrait') {
      newProps.bottom = 'calc(var(--app-panel-width) + .75rem)'
      newProps.right = '.5rem'
      newProps.maxWidth = 'calc(100vw - 1rem)'
      newProps.maxHeight = 'calc(100vh - var(--app-panel-width) - 1.5rem)'
      show = true
    } else if (element === 'account-mobile') {
      newProps.bottom = '.5rem'
      newProps.left = 'calc(var(--app-panel-width) + .5rem)'
      newProps.maxWidth = 'calc(100vw - var(--app-panel-width) - 1rem)'
      newProps.maxHeight = 'calc(100vh - 1rem)'
      show = true
    } else if (element === 'notify') {
      newProps.top = '2.5rem'
      newProps.left = '4.75rem'
      newProps.maxWidth = '42rem'
      newProps.maxHeight = 'calc(100vh - 5rem)'
      show = true
    } else if (element === 'notify-mobile') {
      newProps.bottom = 'calc(var(--app-panel-width) + .75rem)'
      newProps.left = '.5rem'
      newProps.maxWidth = 'calc(100vw - 1rem)'
      newProps.maxHeight = 'calc(100vh - var(--app-panel-width) - 1.5rem)'
      show = true
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
      newProps.top = `${rect.top + 4}px`
      newProps.bottom = '4px'
      newProps.left = '4px'
      newProps.right = '4px'
      show = true
    } else if (element === 'content' && contentPanel !== undefined) {
      const rect = contentPanel.getBoundingClientRect()
      newProps.top = `${rect.top}px`
      // newProps.bottom = `${Math.min(document.body.clientHeight - rect.bottom + 1, window.innerHeight - rect.top - 1)}px`
      newProps.height = `${Math.min(rect.height, window.innerHeight - rect.top)}px`
      newProps.left = `${rect.left}px`
      // newProps.right = `${Math.min(document.body.clientWidth - rect.right, window.innerWidth - rect.left - 5)}px`
      newProps.width = `${Math.min(rect.width, window.innerWidth - rect.left)}px`
    } else if (element === 'middle') {
      if (contentPanel !== undefined) {
        const rect = contentPanel.getBoundingClientRect()
        newProps.top = `calc(${rect.top}px)`
      } else {
        newProps.top = '15%'
      }
      newProps.bottom = '12px'

      if (clientWidth !== undefined && clientHeight !== undefined) {
        newProps.left = `calc(50% - ${clientWidth / 2}px`
      } else {
        newProps.left = '50%'
        newProps.transform = 'translateX(-50%)'
      }
    } else if (element === 'help-center') {
      newProps.top = 'calc(var(--status-bar-height) + 12px)'
      newProps.bottom = '12px'
      newProps.right = '12px'
      show = true
    }
  } else {
    if (clientWidth !== undefined && clientHeight !== undefined) {
      newProps.top = `calc(50% - ${clientHeight / 2}px`
      newProps.left = `calc(50% - ${clientWidth / 2}px`
    } else {
      newProps.top = '50%'
      newProps.left = '50%'
      newProps.transform = 'translate(-50%, -50%)'
    }
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
  const rect = DOMRect.fromRect({ width: 1, height: 1, x: evt.clientX, y: evt.clientY })
  return {
    getBoundingClientRect: () => rect
  }
}
