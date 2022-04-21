import { PopupAlignment } from '@anticrm/ui'

export function getPopupAlignment (e?: Event): PopupAlignment | undefined {
  if (!e || !e.target) {
    return undefined
  }
  const target = e.target as HTMLElement
  if (target.getBoundingClientRect) {
    const result = target.getBoundingClientRect()
    return {
      getBoundingClientRect: () => result
    }
  }

  return undefined
}
