import { type DisplayTx } from '@hcengineering/activity'
import core, {
  type Class,
  type Doc,
  type Hierarchy,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  type TxMixin,
  TxProcessor,
  type TxUpdateDoc
} from '@hcengineering/core'

/**
 * @public
 */
export type ActivityKey = string

/**
 * @public
 */
export function activityKey (objectClass: Ref<Class<Doc>>, txClass: Ref<Class<Tx>>): ActivityKey {
  return objectClass + ':' + txClass
}

export function newDisplayTx (
  tx: TxCUD<Doc>,
  hierarchy: Hierarchy,
  isOwnTx: boolean,
  originTx: TxCUD<Doc> = tx
): DisplayTx {
  const createTx = hierarchy.isDerived(tx._class, core.class.TxCreateDoc) ? (tx as TxCreateDoc<Doc>) : undefined
  return {
    tx,
    isOwnTx,
    txes: [],
    createTx,
    updateTx: hierarchy.isDerived(tx._class, core.class.TxUpdateDoc) ? (tx as TxUpdateDoc<Doc>) : undefined,
    updated: false,
    removed: false,
    mixin: false,
    mixinTx: hierarchy.isDerived(tx._class, core.class.TxMixin) ? (tx as TxMixin<Doc, Doc>) : undefined,
    doc: createTx !== undefined ? TxProcessor.createDoc2Doc(createTx) : undefined,
    originTx
  }
}
