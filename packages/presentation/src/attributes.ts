import { AnyAttribute, Class, Client, Doc, Ref, TxOperations } from '@anticrm/core'

/**
 * @public
 */
export interface KeyedAttribute {
  key: string
  attr: AnyAttribute
}

export async function updateAttribute (
  client: TxOperations,
  object: Doc,
  _class: Ref<Class<Doc>>,
  attribute: KeyedAttribute,
  value: any
): Promise<void> {
  const doc = object
  const attributeKey = attribute.key
  if ((doc as any)[attributeKey] === value) return
  const attr = attribute.attr
  if (client.getHierarchy().isMixin(attr.attributeOf)) {
    await client.updateMixin(doc._id, _class, doc.space, attr.attributeOf, { [attributeKey]: value })
  } else {
    await client.update(object, { [attributeKey]: value })
  }
}

export function getAttribute (client: Client, object: any, key: KeyedAttribute): any {
  // Check if attr is mixin and return it's value
  if (client.getHierarchy().isMixin(key.attr.attributeOf)) {
    return object[key.attr.attributeOf]?.[key.key]
  } else {
    return object[key.key]
  }
}
