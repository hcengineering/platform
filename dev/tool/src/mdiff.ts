import core, { Attribute, Data, Doc, DocumentUpdate, Hierarchy, ModelDb, Ref, Tx, Type } from '@hcengineering/core'
import { deepEqual } from 'fast-equals'

/**
 * @public
 */
export async function buildModel (existingTxes: Tx[]): Promise<{ hierarchy: Hierarchy, model: ModelDb, dropTx: Tx[] }> {
  existingTxes = existingTxes.filter((tx) => tx.modifiedBy === core.account.System)
  const dropTx: Tx[] = []
  const hierarchy = new Hierarchy()
  const model = new ModelDb(hierarchy)
  // Construct existing model
  existingTxes.forEach(hierarchy.tx.bind(hierarchy))
  for (const tx of existingTxes) {
    await applyTx(model, tx, dropTx)
  }
  return { hierarchy, model, dropTx }
}

async function applyTx (model: ModelDb, tx: Tx, dropTx: Tx[]): Promise<void> {
  try {
    await model.tx(tx)
  } catch (err: any) {
    dropTx.push(tx)
    console.info('Found issue during processing of tx. Transaction', tx, 'is dropped...')
  }
}

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
 * Generate a set of transactions to upgrade from one model to another.
 * @public
 */
export async function generateModelDiff (existingTxes: Tx[], txes: Tx[]): Promise<{ diffTx: Op[], dropTx: Tx[] }> {
  const { model, dropTx } = await buildModel(existingTxes)
  const { model: newModel } = await buildModel(txes)

  const diffTx = generateDocumentDiff(
    await model.findAll(core.class.Doc, {}),
    await newModel.findAll(core.class.Doc, {})
  )
  return { diffTx, dropTx }
}

export type Op = Record<string, any>
/**
 * @public
 */
export function generateDocumentDiff (oldDocs: Doc[], newDocs: Doc[]): Op[] {
  const diffTx: Op[] = []

  const allDocuments = new Map(oldDocs.map((d) => [getId(d), d]))
  const newDocuments = new Map(newDocs.map((d) => [getId(d), d]))

  // Find same documents.
  allDocuments.forEach(handleUpdateRemove(newDocuments, diffTx))
  newDocuments.forEach(handleAdd(allDocuments, diffTx))
  return diffTx
}

function getId (d: Doc): Ref<Doc> {
  // We need to update Attribute IDS
  if (d._class === core.class.Attribute) {
    const attr = d as Attribute<Type<any>>
    return (attr.attributeOf + '.' + attr.name) as Ref<Doc>
  } else if (d._class === ('view:class:Viewlet' as Ref<Doc>)) {
    const cr = d as any
    return ((cr.attachTo as string) + '.' + (cr.open as string)) as Ref<Doc>
  } else if (d._class === ('workbench:class:Application' as Ref<Doc>)) {
    const cr = d as any
    return ('workbench.app.' + (cr.label as string)) as Ref<Doc>
  } else if (d._class === ('server-core:class:Trigger' as Ref<Doc>)) {
    const cr = d as any
    return cr.trigger as string as Ref<Doc>
  }
  return d._id
}

function handleAdd (allDocuments: Map<Ref<Doc>, Doc>, newTxes: Op[]): (value: Doc, key: Ref<Doc>) => void {
  return (doc, key) => {
    if (!allDocuments.has(key)) {
      // Add is required
      const { _id, _class, modifiedBy, modifiedOn, space, ...data } = doc
      const tx: Op = {
        _class: 'create-doc',
        objectId: _id,
        objectClass: doc._class,
        attributes: data
      }
      newTxes.push(tx)
    }
  }
}

function handleUpdateRemove (newDocuments: Map<Ref<Doc>, Doc>, newTxes: Op[]): (value: Doc, key: Ref<Doc>) => void {
  return (doc, key) => {
    const newDoc = newDocuments.get(key)
    if (newDoc !== undefined) {
      // update is required.
      const { _id, _class, modifiedBy, modifiedOn, space, ...data } = newDoc
      const { _id: _0, _class: _1, modifiedBy: _2, modifiedOn: _3, space: _4, ...oldData } = doc
      const operations = diffAttributes(oldData, data)
      if (Object.keys(operations).length > 0) {
        const tx: Op = {
          _class: 'update-doc',
          objectId: _id,
          objectClass: _class,
          operations
        }
        newTxes.push(tx)
      }
    } else {
      // Delete is required
      const { _id: oldId, _class: _1, modifiedBy: _2, modifiedOn: _3, space: _4, ...oldData } = doc
      const tx: Op = {
        _class: 'remove-doc',
        objectId: oldId,
        objectClass: doc._class,
        data: oldData
      }
      newTxes.push(tx)
    }
  }
}

export function printDiff (diffTx: Op[]): void {
  // Collect Classes.
  console.log('Diff Transactions', JSON.stringify(diffTx, undefined, 2))
}
