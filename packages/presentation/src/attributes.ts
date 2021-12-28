import core, { AnyAttribute, AttachedDoc, Class, Client, Doc, Ref, TxOperations } from '@anticrm/core'

/**
 * @public
 */
export interface KeyedAttribute {
  key: string
  attr: AnyAttribute
}

export async function updateAttribute (client: Client & TxOperations, object: Doc, _class: Ref<Class<Doc>>, attribute: KeyedAttribute, value: any): Promise<void> {
  const doc = object
  const attributeKey = attribute.key
  const attr = attribute.attr
  if (client.getHierarchy().isMixin(attr.attributeOf)) {
    await client.updateMixin(doc._id, _class, doc.space, attr.attributeOf, { [attributeKey]: value })
  } else if (client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)) {
    const adoc = object as AttachedDoc
    await client.updateCollection(_class, object.space, adoc._id, adoc.attachedTo, adoc.attachedToClass, adoc.collection, { [attributeKey]: value })
  } else {
    await client.updateDoc(_class, doc.space, doc._id, { [attributeKey]: value })
  }
}

export function getAttribute (client: Client, object: any, key: string | KeyedAttribute): any {
  if (typeof key === 'string') {
    return object[key]
  }
  // Check if attr is mixin and return it's value
  if (client.getHierarchy().isMixin(key.attr.attributeOf)) {
    return (object[key.attr.attributeOf] ?? {})[key.key]
  } else {
    return object[key.key]
  }
}
