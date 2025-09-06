import { getWorkspaceById, getWorkspaceByUrl, type AccountDB, type Workspace } from '@hcengineering/account'
import {
  type AttachedData,
  type AttachedDoc,
  type Class,
  type Doc,
  type DocumentUpdate,
  type Ref,
  type Space,
  type TxOperations,
  type WorkspaceUuid
} from '@hcengineering/core'

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

export async function getWorkspace (db: AccountDB, workspace: string): Promise<Workspace | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  let wsObj: Workspace | null

  if (uuidRegex.test(workspace)) {
    wsObj = await getWorkspaceById(db, workspace as WorkspaceUuid)
  } else {
    wsObj = await getWorkspaceByUrl(db, workspace)
  }

  return wsObj
}

export { getToolToken, getWorkspaceTransactorEndpoint } from '@hcengineering/server-tool'
