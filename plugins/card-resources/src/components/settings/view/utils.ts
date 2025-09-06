import { type Data } from '@hcengineering/core'
import { type Viewlet } from '@hcengineering/view'

export function updateViewletConfig (viewlet: Data<Viewlet> | Viewlet, items: any[]): void {
  const enabledAttibutes = items.filter((it) => it.type === 'attribute' && it.enabled).map((it) => it.value)
  viewlet.config = viewlet.config.filter((configItem) => {
    if (configItem === undefined) return false
    if (typeof configItem === 'string') {
      return enabledAttibutes.includes(configItem)
    } else if (configItem !== undefined && typeof configItem === 'object') {
      return enabledAttibutes.includes(configItem.key)
    }
    return false
  })

  const newAttributes = enabledAttibutes.filter((attr) => {
    if (
      viewlet.config.some((configItem) => {
        return typeof configItem === 'string' ? configItem === attr : configItem.key === attr
      })
    ) {
      return false
    }
    return true
  })

  viewlet.config = viewlet.config.concat(newAttributes)
}
