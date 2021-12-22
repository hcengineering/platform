import { AttachedData, AttachedDoc, Class, Data, Doc, DocumentUpdate, MeasureContext, Ref, Space, TxOperations } from '@anticrm/core'

export async function findOrUpdate<T extends Doc> (ctx: MeasureContext, client: TxOperations, space: Ref<Space>, _class: Ref<Class<T>>, objectId: Ref<T>, data: Data<T>): Promise<void> {
  const existingObj = await client.findOne<Doc>(_class, { _id: objectId, space })
  if (existingObj !== undefined) {
    await client.updateDoc(_class, space, objectId, data)
  } else {
    await client.createDoc(_class, space, data, objectId)
  }
}
export async function findOrUpdateAttached<T extends AttachedDoc> (ctx: MeasureContext, client: TxOperations, space: Ref<Space>, _class: Ref<Class<T>>, objectId: Ref<T>, data: AttachedData<T>, attached: {attachedTo: Ref<Doc>, attachedClass: Ref<Class<Doc>>, collection: string}): Promise<void> {
  const existingObj = await client.findOne<Doc>(_class, { _id: objectId, space })
  if (existingObj !== undefined) {
    await client.updateCollection(_class, space, objectId, attached.attachedTo, attached.attachedClass, attached.collection, data as unknown as DocumentUpdate<T>)
  } else {
    await client.addCollection(_class, space, attached.attachedTo, attached.attachedClass, attached.collection, data, objectId)
  }
}
