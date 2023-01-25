import core, { Class, Client, Doc, DocIndexState, Ref } from '@hcengineering/core'
import { writable } from 'svelte/store'

export interface InferenceFocus {
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>

  state: DocIndexState
}
/**
 * @public
 */
export const inferenceFocusStore = writable<InferenceFocus | undefined>(undefined)

/**
 * @public
 */
export async function updateFocus (client: Client, doc?: { _id: Ref<Doc>, _class: Ref<Class<Doc>> }): Promise<void> {
  if (doc === undefined) {
    inferenceFocusStore.set(undefined)
    return
  }

  const state = await client.findOne(core.class.DocIndexState, {
    _id: doc._id as Ref<DocIndexState>,
    objectClass: doc._class
  })
  if (state !== undefined) {
    inferenceFocusStore.update(() => {
      return { objectId: doc._id, objectClass: doc._class, state }
    })
  }
}
