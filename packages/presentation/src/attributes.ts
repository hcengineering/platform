import { AnyAttribute, Client } from '@hcengineering/core'

/**
 * @public
 */
export interface KeyedAttribute {
  key: string
  attr: AnyAttribute
}

export { updateAttribute } from '@hcengineering/core'

export function getAttribute (client: Client, object: any, key: KeyedAttribute): any {
  // Check if attr is mixin and return it's value
  if (client.getHierarchy().isMixin(key.attr.attributeOf)) {
    return (client.getHierarchy().as(object, key.attr.attributeOf) as any)[key.key]
  } else {
    return object[key.key]
  }
}
