import { Class, Data, Doc, DocumentUpdate, Ref, Space, TxOperations } from '@hcengineering/core'
import { deepEqual } from 'fast-equals'

function toUndef (value: any): any {
  return value === null ? undefined : value
}

function diffAttributes (doc: Data<Doc>, newDoc: Data<Doc>): DocumentUpdate<Doc> {
  const result: DocumentUpdate<any> = {}
  const allDocuments = new Map(Object.entries(doc))
  const newDocuments = new Map(Object.entries(newDoc))

  for (const [key, value] of allDocuments) {
    const newValue = toUndef(newDocuments.get(key))
    if (!deepEqual(newValue, toUndef(value))) {
      // update is required, since values are different
      result[key] = newValue
    }
  }
  for (const [key, value] of newDocuments) {
    const oldValue = toUndef(allDocuments.get(key))
    if (oldValue === undefined && value !== undefined) {
      // Update with new value.
      result[key] = value
    }
  }
  return result
}

/**
 * Create or update document if modified only by system account.
 * @public
 */
export async function createOrUpdate<T extends Doc> (
  client: TxOperations,
  _class: Ref<Class<T>>,
  space: Ref<Space>,
  data: Data<T>,
  _id: Ref<T>
): Promise<void> {
  const existingDoc = await client.findOne<Doc>(_class, { _id })
  if (existingDoc !== undefined) {
    const { _class: _oldClass, _id, space: _oldSpace, modifiedBy, modifiedOn, ...oldData } = existingDoc
    if (modifiedBy === client.txFactory.account) {
      const updateOp = diffAttributes(oldData, data)
      if (Object.keys(updateOp).length > 0) {
        await client.update(existingDoc, updateOp)
      }
    }
  } else {
    await client.createDoc<T>(_class, space, data, _id)
  }
}
