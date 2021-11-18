import { Class, Doc, Ref, Tx } from '@anticrm/core'

export type ActivityKey = string

export function activityKey (objectClass: Ref<Class<Doc>>, txClass: Ref<Class<Tx>>): ActivityKey {
  return objectClass + ':' + txClass
}
