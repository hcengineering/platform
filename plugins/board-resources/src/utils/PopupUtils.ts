import { PopupAlignment } from '@anticrm/ui'

export function getPopupAlignment (e?: Event): PopupAlignment | undefined {
  if (!e || !e.target) {
    return undefined
  }
  const target = e.target as HTMLElement
  if (target.getBoundingClientRect) {
    return {
      getBoundingClientRect: () => target.getBoundingClientRect()
    }
  }

  return undefined
}
