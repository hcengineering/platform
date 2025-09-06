import {
  type Class,
  type Data,
  type Doc,
  type DocumentUpdate,
  type Ref,
  type Space,
  type TxOperations,
  type IdMap
} from '@hcengineering/core'
import { deepEqual } from 'fast-equals'

function toUndef (value: any): any {
  return value === null ? undefined : value
}

function diffAttributes (doc: Data<Doc>, newDoc: Data<Doc>): DocumentUpdate<Doc> {
  const result: DocumentUpdate<any> = {}
  const allDocuments = new Map(Object.entries(doc))
  const newDocuments = new Map(Object.entries(newDoc))

  for (const [key, value] of allDocuments) {
    if (!newDocuments.has(key)) {
      continue
    }

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
  _id: Ref<T>,
  cache?: IdMap<Doc>
): Promise<void> {
  const existingDoc = cache !== undefined ? cache.get(_id) : await client.findOne<Doc>(_class, { _id })
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

/**
 * @public
 */
export interface ModelLogger {
  log: (msg: string, data: any) => void
  error: (msg: string, err: any) => void
}

const errorPrinter = ({ message, stack, ...rest }: Error): object => ({
  message,
  stack,
  ...rest
})
function replacer (value: any): any {
  return value instanceof Error ? errorPrinter(value) : value
}

/**
 * @public
 */
export const consoleModelLogger: ModelLogger = {
  log (msg: string, data: any): void {
    console.log(msg, data)
  },
  error (msg: string, data: any): void {
    console.error(msg, replacer(data))
  }
}
