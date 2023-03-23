import core, { AnyAttribute, Class, Client, Doc, Ref, TxOperations } from '@hcengineering/core'

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
    if (client.getHierarchy().isDerived(attribute.attr.type._class, core.class.ArrOf)) {
      const oldvalue: any[] = (object as any)[attributeKey] ?? []
      const val: any[] = value
      const toPull = oldvalue.filter((it: any) => !val.includes(it))

      const toPush = val.filter((it) => !oldvalue.includes(it))
      if (toPull.length > 0) {
        await client.update(object, { $pull: { [attributeKey]: { $in: toPull } } })
      }
      if (toPush.length > 0) {
        await client.update(object, { $push: { [attributeKey]: { $each: toPush, $position: 0 } } })
      }
    } else {
      await client.update(object, { [attributeKey]: value })
    }
  }
}

export function getAttribute (client: Client, object: any, key: KeyedAttribute): any {
  // Check if attr is mixin and return it's value
  if (client.getHierarchy().isMixin(key.attr.attributeOf)) {
    return (client.getHierarchy().as(object, key.attr.attributeOf) as any)[key.key]
  } else {
    return object[key.key]
  }
}
