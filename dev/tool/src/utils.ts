import { AttachedData, AttachedDoc, Class, Doc, DocumentUpdate, Ref, Space, TxOperations } from '@hcengineering/core'

export async function findOrUpdateAttached<T extends AttachedDoc> (
  client: TxOperations,
  space: Ref<Space>,
  _class: Ref<Class<T>>,
  objectId: Ref<T>,
  data: AttachedData<T>,
  attached: { attachedTo: Ref<Doc>, attachedClass: Ref<Class<Doc>>, collection: string }
): Promise<T> {
  let existingObj = (await client.findOne<Doc>(_class, { _id: objectId, space })) as T
  if (existingObj !== undefined) {
    await client.updateCollection(
      _class,
      space,
      objectId,
      attached.attachedTo,
      attached.attachedClass,
      attached.collection,
      data as unknown as DocumentUpdate<T>
    )
  } else {
    await client.addCollection(
      _class,
      space,
      attached.attachedTo,
      attached.attachedClass,
      attached.collection,
      data,
      objectId
    )
    existingObj = { _id: objectId, _class, space, ...data, ...attached } as unknown as T
  }
  return existingObj
}
