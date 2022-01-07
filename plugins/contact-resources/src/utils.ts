import { Class, Doc, Ref } from '@anticrm/core'
import { getPlatformColorForText } from '@anticrm/ui'

export function getMixinStyle (id: Ref<Class<Doc>>, selected: boolean): string {
  const color = getPlatformColorForText(id as string)
  return `
    background: ${color + (selected ? 'ff' : '33')};
    border: 1px solid ${color + (selected ? '0f' : '66')};
  `
}
