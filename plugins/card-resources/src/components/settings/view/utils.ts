import { type Data } from '@hcengineering/core'
import { type Viewlet } from '@hcengineering/view'
import { type AttributeConfig, type Config, isAttribute } from '@hcengineering/view-resources'

export function updateViewletConfig (viewlet: Data<Viewlet> | Viewlet, items: Array<Config | AttributeConfig>): void {
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

  viewlet.config = items
    .filter((it) => (isAttribute(it) && it.enabled) || it.type === 'divider')
    .map((it) => {
      const existing = viewlet.config.find((configItem) => isMatch(configItem, it.value))
      return existing ?? it.value
    })
    .filter((it) => it !== undefined)
}
