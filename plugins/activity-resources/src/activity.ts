import core, {
  AnyAttribute,
  AttachedDoc,
  Class,
  Client,
  Doc,
  DocumentUpdate,
  Hierarchy,
  Ref,
  SortingOrder,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc
} from '@anticrm/core'
import { createQuery, LiveQuery } from '@anticrm/presentation'

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

function isEqualOps (op1: DocumentUpdate<Doc>, op2: DocumentUpdate<Doc>): boolean {
  const o1 = Object.keys(op1).sort().join('-')
  const o2 = Object.keys(op2).sort().join('-')
  return o1 === o2
}

/**
 * Transaction being displayed.
 * @public
 */
export interface DisplayTx {
  // Source tx
  tx: TxCUD<Doc>

  // A set of collapsed transactions.
  txes: Array<TxCUD<Doc>>

  // type check for createTx
  createTx?: TxCreateDoc<Doc>

  // Type check for updateTx
  updateTx?: TxUpdateDoc<Doc>

  // Document in case it is required.
  doc?: Doc

  updated: boolean
  removed: boolean
}

/**
 * @public
 */
export type DisplayTxListener = (txes: DisplayTx[]) => void

// Use 5 minutes to combine similar transactions.
const combineThreshold = 5 * 60 * 1000
/**
 * Define activity.
 *
 * Allow to recieve a list of transactions and notify client about it.
 */
export interface Activity {
  update: (object: Doc, listener: DisplayTxListener, sort: SortingOrder) => void
}

class ActivityImpl implements Activity {
  private readonly txQuery1: LiveQuery
  private readonly txQuery2: LiveQuery
  private readonly hiddenAttributes: Set<string>

  private txes1: Array<TxCUD<Doc>> = []
  private txes2: Array<TxCUD<Doc>> = []
  constructor (readonly client: Client, attributes: Map<string, AnyAttribute>) {
    this.hiddenAttributes = new Set([...attributes.entries()]
      .filter(([, value]) => value.hidden === true)
      .map(([key]) => key))
    this.txQuery1 = createQuery()
    this.txQuery2 = createQuery()
  }

  private notify (object: Doc, listener: DisplayTxListener, sort: SortingOrder): void {
    this.combineTransactions(object, this.txes1, this.txes2).then(
      (result) => {
        const sorted = result.sort((a, b) => (a.tx.modifiedOn - b.tx.modifiedOn) * sort)
        listener(sorted)
      },
      (err) => {
        console.error(err)
      }
    )
  }

  update (object: Doc, listener: DisplayTxListener, sort: SortingOrder): void {
    let isAttached = false

    isAttached = this.client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)

    this.txQuery1.query<TxCollectionCUD<Doc, AttachedDoc>>(
      isAttached ? core.class.TxCollectionCUD : core.class.TxCUD,
      isAttached
        ? { 'tx.objectId': object._id as Ref<AttachedDoc> }
        : {
            objectId: object._id,
            _class: { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc] }
          },
      (result) => {
        this.txes1 = result
        this.notify(object, listener, sort)
      },
      { sort: { modifiedOn: SortingOrder.Descending } }
    )

    this.txQuery2.query<TxCUD<Doc>>(
      core.class.TxCollectionCUD,
      {
        objectId: object._id,
        'tx._class': { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc] }
      },
      (result) => {
        this.txes2 = result
        this.notify(object, listener, sort)
      },
      { sort: { modifiedOn: SortingOrder.Descending } }
    )
  }

  async combineTransactions (object: Doc, txes1: Array<TxCUD<Doc>>, txes2: Array<TxCUD<Doc>>): Promise<DisplayTx[]> {
    const hierarchy = this.client.getHierarchy()

    // We need to sort with with natural order, to build a proper doc values.
    const allTx = Array.from(txes1).concat(txes2).sort(this.sortByLastModified)
    const txCUD: Array<TxCUD<Doc>> = this.filterTxCUD(allTx, hierarchy)

    const parents = new Map<Ref<Doc>, DisplayTx>()

    let results: DisplayTx[] = []

    for (const tx of txCUD) {
      const { collectionCUD, updateCUD, result, tx: ntx } = this.createDisplayTx(tx, parents)
      // We do not need collection object updates, in main list of displayed transactions.
      if (this.isDisplayTxRequired(collectionCUD, updateCUD, ntx, object)) {
        // Combine previous update transaction for same field and if same operation and time treshold is ok
        results = this.integrateTxWithResults(results, result)
        this.updateRemovedState(result, results)
      }
    }
    console.log('DISPLAY TX', results)
    return Array.from(results)
  }

  private updateRemovedState (result: DisplayTx, results: DisplayTx[]): void {
    if (result.removed) {
      // We need to mark all transactions for same object as removed as well.
      for (const t of results) {
        if (t.tx.objectId === result.tx.objectId) {
          t.removed = true
        }
      }
    }
  }

  sortByLastModified (a: TxCUD<Doc>, b: TxCUD<Doc>): number {
    return a.modifiedOn - b.modifiedOn
  }

  isDisplayTxRequired (collectionCUD: boolean, updateCUD: boolean, ntx: TxCUD<Doc>, object: Doc): boolean {
    return !(collectionCUD && updateCUD) || ntx.objectId === object._id
  }

  private readonly getUpdateTx = (tx: TxCUD<Doc>): [TxCollectionCUD<Doc, any>, TxUpdateDoc<Doc>] | undefined => {
    if (tx._class !== core.class.TxCollectionCUD) {
      return undefined
    }

    const colTx = tx as TxCollectionCUD<Doc, any>

    if (colTx.tx._class !== core.class.TxUpdateDoc) {
      return undefined
    }

    return [colTx, colTx.tx as TxUpdateDoc<Doc>]
  }

  filterTxCUD (allTx: Array<TxCUD<Doc>>, hierarchy: Hierarchy): Array<TxCUD<Doc>> {
    const targetTxes = allTx.filter((tx) => hierarchy.isDerived(tx._class, core.class.TxCUD))

    return targetTxes
      .map((tx) => {
        const updateTx = this.getUpdateTx(tx)

        if (updateTx === undefined) {
          return tx
        }

        const [colTx, utx] = updateTx
        const newOps = Object.entries(utx.operations)
          .filter(([key]) => !this.hiddenAttributes.has(key))
          .reduce((res, [k, v]) => ({ ...res, [k]: v }), {})

        return {
          ...colTx,
          tx: {
            ...utx,
            operations: newOps
          }
        }
      })
      .filter((tx) => {
        const updateTx = this.getUpdateTx(tx)

        if (updateTx === undefined) {
          return true
        }

        return Object.keys(updateTx[1].operations).length > 0
      })
  }

  createDisplayTx (
    tx: TxCUD<Doc>,
    parents: Map<Ref<Doc>, DisplayTx>
  ): { collectionCUD: boolean, updateCUD: boolean, result: DisplayTx, tx: TxCUD<Doc> } {
    let collectionCUD = false
    let updateCUD = false
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
      tx = getCollectionTx(tx as TxCollectionCUD<Doc, AttachedDoc>)
      collectionCUD = true
    }
    let firstTx = parents.get(tx.objectId)
    const result: DisplayTx = this.newDisplayTx(tx)

    result.doc = firstTx?.doc ?? result.doc

    firstTx = firstTx ?? result
    parents.set(tx.objectId, firstTx)

    // If we have updates also apply them all.
    updateCUD = this.checkUpdateState(result, firstTx)

    this.checkRemoveState(hierarchy, tx, firstTx, result)
    return { collectionCUD, updateCUD, result, tx }
  }

  private checkRemoveState (hierarchy: Hierarchy, tx: TxCUD<Doc>, firstTx: DisplayTx, result: DisplayTx): void {
    if (hierarchy.isDerived(tx._class, core.class.TxRemoveDoc)) {
      firstTx.removed = true
      result.removed = true
    }
  }

  checkUpdateState (result: DisplayTx, firstTx: DisplayTx): boolean {
    if (this.client.getHierarchy().isDerived(result.tx._class, core.class.TxUpdateDoc) && result.doc !== undefined) {
      firstTx.doc = TxProcessor.updateDoc2Doc(result.doc, result.tx as TxUpdateDoc<Doc>)
      firstTx.updated = true
      result.updated = true
      return true
    }
    return false
  }

  newDisplayTx (tx: TxCUD<Doc>): DisplayTx {
    const hierarchy = this.client.getHierarchy()
    const createTx = hierarchy.isDerived(tx._class, core.class.TxCreateDoc) ? (tx as TxCreateDoc<Doc>) : undefined
    return {
      tx,
      txes: [],
      createTx,
      updateTx: hierarchy.isDerived(tx._class, core.class.TxUpdateDoc) ? (tx as TxUpdateDoc<Doc>) : undefined,
      updated: false,
      removed: false,
      doc: createTx !== undefined ? TxProcessor.createDoc2Doc(createTx) : undefined
    }
  }

  integrateTxWithResults (results: DisplayTx[], result: DisplayTx): DisplayTx[] {
    const curUpdate = result.tx as unknown as TxUpdateDoc<Doc>

    const newResult = results.filter((prevTx) => {
      if (this.isSameKindTx(prevTx, result)) {
        const prevUpdate = prevTx.tx as unknown as TxUpdateDoc<Doc>
        if (
          result.tx.modifiedOn - prevUpdate.modifiedOn < combineThreshold &&
          isEqualOps(prevUpdate.operations, curUpdate.operations)
        ) {
          // we have same keys,
          // Remember previous transactions
          result.txes.push(...prevTx.txes, prevTx.tx)
          return false
        }
      }

      return true
    })
    newResult.push(result)
    return newResult
  }

  isSameKindTx (prevTx: DisplayTx, result: DisplayTx): boolean {
    return (
      prevTx.tx.objectId === result.tx.objectId && // Same document id
      prevTx.tx._class === result.tx._class && // Same transaction class
      result.tx._class === core.class.TxUpdateDoc &&
      prevTx.tx.modifiedBy === result.tx.modifiedBy // Same user
    )
  }
}

function getCollectionTx (cltx: TxCollectionCUD<Doc, AttachedDoc>): TxCUD<Doc> {
  if (cltx.tx._class === core.class.TxCreateDoc) {
    // We need to update tx to contain attachedDoc, attachedClass & collection
    const create = cltx.tx as TxCreateDoc<AttachedDoc>
    create.attributes.attachedTo = cltx.objectId
    create.attributes.attachedToClass = cltx.objectClass
    create.attributes.collection = cltx.collection
    return create
  }
  return cltx.tx
}

/**
 * Construct an new activity, to listend for displayed transactions in UI.
 * @param client
 */
export function newActivity (client: Client, attributes: Map<string, AnyAttribute>): Activity {
  return new ActivityImpl(client, attributes)
}
