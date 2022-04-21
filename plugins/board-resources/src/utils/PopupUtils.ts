import { PopupAlignment } from '@anticrm/ui'
import { HorizontalAlignment, VerticalAlignment } from '@anticrm/ui/src/types'

export function getPopupAlignment (e?: Event, position?: {v: VerticalAlignment, h: HorizontalAlignment}): PopupAlignment | undefined {
  if (!e || !e.target) {
    return undefined
  }
  const target = e.target as HTMLElement
  return getElementPopupAlignment(target, position)
}

export function getElementPopupAlignment (el: HTMLElement, position?: {v: VerticalAlignment, h: HorizontalAlignment}): PopupAlignment | undefined {
  if (el?.getBoundingClientRect) {
    const result = el.getBoundingClientRect()
    return {
      getBoundingClientRect: () => result,
      position
    }
  }

  return undefined
}
