import core, { AttachedDoc, Doc, Tx, TxCollectionCUD, TxCreateDoc } from '@anticrm/core'

/**
 * @public
 */
export function extractTx (tx: Tx): Tx {
  if (tx._class === core.class.TxCollectionCUD) {
    const ctx = tx as TxCollectionCUD<Doc, AttachedDoc>
    if (ctx.tx._class === core.class.TxCreateDoc) {
      const create = ctx.tx as TxCreateDoc<AttachedDoc>
      create.attributes.attachedTo = ctx.objectId
      create.attributes.attachedToClass = ctx.objectClass
      create.attributes.collection = ctx.collection
      return create
    }
    return ctx.tx
  }

  return tx
}
