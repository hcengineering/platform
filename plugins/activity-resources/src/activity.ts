import activity, { type DisplayTx, type SavedMessage } from '@hcengineering/activity'
import core, {
  type Class,
  type Doc,
  type Hierarchy,
  type Ref,
  SortingOrder,
  type Tx,
  type TxCreateDoc,
  type TxCUD,
  type TxMixin,
  TxProcessor,
  type TxUpdateDoc,
  type WithLookup
} from '@hcengineering/core'
import { writable } from 'svelte/store'
import { createQuery, getClient } from '@hcengineering/presentation'

// TODO: remove old code
/**
 * @public
 */
export type ActivityKey = string

/**
 * @public
 */
// TODO: remove old code
export function activityKey (objectClass: Ref<Class<Doc>>, txClass: Ref<Class<Tx>>): ActivityKey {
  return objectClass + ':' + txClass
}

// TODO: remove old code
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

export const savedMessagesStore = writable<Array<WithLookup<SavedMessage>>>([])

const savedMessagesQuery = createQuery(true)

export function loadSavedMessages (): void {
  const client = getClient()

  if (client !== undefined) {
    savedMessagesQuery.query(
      activity.class.SavedMessage,
      {},
      (res) => {
        savedMessagesStore.set(res.filter(({ $lookup }) => $lookup?.attachedTo !== undefined))
      },
      { lookup: { attachedTo: activity.class.ActivityMessage }, sort: { modifiedOn: SortingOrder.Descending } }
    )
  } else {
    setTimeout(() => {
      loadSavedMessages()
    }, 50)
  }
}

loadSavedMessages()
