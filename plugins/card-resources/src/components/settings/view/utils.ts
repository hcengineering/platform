import { type Data } from '@hcengineering/core'
import { type Viewlet } from '@hcengineering/view'

export function updateViewletConfig (viewlet: Data<Viewlet> | Viewlet, items: any[]): void {
  const enabledAttributes = items.filter((it) => it.type === 'attribute' && it.enabled).map((it) => it.value)

  const getKey = (item: any): string | undefined => {
    return typeof item === 'string' ? item : item?.key
  }

  const isMatch = (a: any, b: any): boolean => {
    const keyA = getKey(a)
    const keyB = getKey(b)
    if (keyA !== keyB) return false
    if (keyA === '' || keyA === undefined) {
      return a === b
    }
    return true
  }

  viewlet.config = viewlet.config.filter((configItem) => {
    if (configItem === undefined) return false
    return enabledAttributes.some((attr) => isMatch(configItem, attr))
  })

  const newAttributes = enabledAttributes.filter((attr) => {
    return !viewlet.config.some((configItem) => isMatch(configItem, attr))
  })

  viewlet.config = viewlet.config.concat(newAttributes)
}
