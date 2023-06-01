import { DisplayTx } from '@hcengineering/activity'
import core, {
  AnyAttribute,
  AttachedDoc,
  Attribute,
  Class,
  Client,
  Collection,
  Doc,
  Hierarchy,
  Ref,
  SortingOrder,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxUpdateDoc
} from '@hcengineering/core'
import { createQuery, LiveQuery } from '@hcengineering/presentation'

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

function isEqualOps (op1: any, op2: any): boolean {
  if (typeof op1 === 'string' && typeof op2 === 'string') {
    return op1 === op2
  }
  if (typeof op1 !== typeof op2) {
    return false
  }
  const o1 = Object.keys(op1).sort().join('-')
  const o2 = Object.keys(op2).sort().join('-')
  return o1 === o2
}

/**
 * @public
 */
export type DisplayTxListener = (objectId: Ref<Doc>, txes: DisplayTx[]) => void

// Use 5 minutes to combine similar transactions.
const combineThreshold = 5 * 60 * 1000
const createCombineThreshold = 10 * 1000

/**
 * Define activity.
 *
 * Allow to recieve a list of transactions and notify client about it.
 */
export interface Activity {
  update: (
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>,
    listener: DisplayTxListener,
    sort: SortingOrder,
    editable: Map<Ref<Class<Doc>>, boolean>
  ) => boolean
}

class ActivityImpl implements Activity {
  private readonly ownTxQuery: LiveQuery
  private readonly attachedTxQuery: LiveQuery
  private readonly attachedChangeTxQuery: LiveQuery
  private readonly hiddenAttributes: Set<string>
  private prevObjectId: Ref<Doc> | undefined
  private prevObjectClass: Ref<Class<Doc>> | undefined
  private editable: Map<Ref<Class<Doc>>, boolean> | undefined

  private ownTxes: Array<TxCUD<Doc>> = []
  private attachedTxes: Array<TxCollectionCUD<Doc, AttachedDoc>> = []
  private attacheChangedTxes: Array<TxCollectionCUD<Doc, AttachedDoc>> = []
  private readonly hierarchy: Hierarchy
  constructor (readonly client: Client, attributes: Map<string, AnyAttribute>) {
    this.hierarchy = client.getHierarchy()
    this.hiddenAttributes = new Set(
      [...attributes.entries()].filter(([, value]) => value.hidden === true).map(([key]) => key)
    )
    this.ownTxQuery = createQuery()
    this.attachedTxQuery = createQuery()
    this.attachedChangeTxQuery = createQuery()
  }

  private notify (objectId: Ref<Doc>, listener: DisplayTxListener, sort: SortingOrder): void {
    if (this.editable != null) {
      this.combineTransactions(objectId, this.ownTxes, this.attachedTxes, this.attacheChangedTxes, this.editable).then(
        (result) => {
          const sorted = result.sort((a, b) => (a.tx.modifiedOn - b.tx.modifiedOn) * sort)
          listener(objectId, sorted)
        },
        (err) => {
          console.error(err)
        }
      )
    }
  }

  update (
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>,
    listener: DisplayTxListener,
    sort: SortingOrder,
    editable: Map<Ref<Class<Doc>>, boolean>
  ): boolean {
    this.editable = editable
    if (objectId === this.prevObjectId && objectClass === this.prevObjectClass) {
      return false
    }
    this.prevObjectClass = objectClass
    this.prevObjectId = objectId
    let isAttached = false

    isAttached = this.hierarchy.isDerived(objectClass, core.class.AttachedDoc)

    this.ownTxQuery.query<TxCUD<Doc>>(
      isAttached ? core.class.TxCollectionCUD : core.class.TxCUD,
      isAttached
        ? { 'tx.objectId': objectId as Ref<AttachedDoc> }
        : {
            objectId,
            _class: {
              $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc, core.class.TxMixin]
            }
          },
      (result) => {
        this.ownTxes = result
        this.notify(objectId, listener, sort)
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )

    this.attachedTxQuery.query<TxCollectionCUD<Doc, AttachedDoc>>(
      core.class.TxCollectionCUD,
      {
        objectId,
        'tx._class': { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc] }
      },
      (result) => {
        this.attachedTxes = result
        this.notify(objectId, listener, sort)
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )

    this.attachedChangeTxQuery.query<TxCollectionCUD<Doc, AttachedDoc>>(
      core.class.TxCollectionCUD,
      {
        'tx.operations.attachedTo': objectId,
        'tx._class': core.class.TxUpdateDoc
      },
      (result) => {
        this.attacheChangedTxes = result
        this.notify(objectId, listener, sort)
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )
    // In case editable is changed
    this.notify(objectId, listener, sort)
    return true
  }

  async combineTransactions (
    _id: Ref<Doc>,
    ownTxes: Array<TxCUD<Doc>>,
    attachedTxes: Array<TxCollectionCUD<Doc, AttachedDoc>>,
    attachedChangeTxes: Array<TxCollectionCUD<Doc, AttachedDoc>>,
    editable: Map<Ref<Class<Doc>>, boolean>
  ): Promise<DisplayTx[]> {
    const parents = new Map<Ref<Doc>, DisplayTx>()

    let results: DisplayTx[] = []

    for (const tx of ownTxes) {
      if (!this.filterUpdateTx(tx)) continue
      const [result] = this.createDisplayTx(tx, parents, true)
      // Combine previous update transaction for same field and if same operation and time treshold is ok
      results = this.integrateTxWithResults(results, result, editable)
      this.updateRemovedState(result, results)
    }

    for (let tx of Array.from(attachedTxes)
      .concat(attachedChangeTxes)
      .sort((a, b) => a.modifiedOn - b.modifiedOn)) {
      if (!this.filterUpdateTx(tx)) continue
      const changeAttached = this.isChangeAttachedTx(tx)
      if (changeAttached || this.isDisplayTxRequired(tx)) {
        if (changeAttached) {
          tx = await this.createFakeTx(_id, tx)
        }
        const [result, isUpdated, isMixin] = this.createDisplayTx(tx, parents, false)
        if (!(isUpdated || isMixin)) {
          // Combine previous update transaction for same field and if same operation and time treshold is ok
          results = this.integrateTxWithResults(results, result, editable)
          this.updateRemovedState(result, results)
        }
      }
    }
    return results
  }

  private async createFakeTx (
    _id: Ref<Doc>,
    cltx: TxCollectionCUD<Doc, AttachedDoc>
  ): Promise<TxCollectionCUD<Doc, AttachedDoc>> {
    if (_id === cltx.objectId) {
      cltx.tx._class = core.class.TxRemoveDoc
    } else {
      const createTx = await this.client.findOne(core.class.TxCollectionCUD, {
        'tx.objectId': cltx.tx.objectId,
        'tx._class': core.class.TxCreateDoc
      })
      if (createTx !== undefined) {
        cltx.tx = createTx.tx
        cltx.tx.modifiedBy = cltx.modifiedBy
        cltx.tx.modifiedOn = cltx.modifiedOn
      }
    }
    return cltx
  }

  private isChangeAttachedTx (cltx: TxCollectionCUD<Doc, AttachedDoc>): boolean {
    const tx = TxProcessor.extractTx(cltx)
    if (this.hierarchy.isDerived(tx._class, core.class.TxUpdateDoc)) {
      const utx = tx as TxUpdateDoc<AttachedDoc>
      return utx.operations.attachedTo !== undefined
    }
    return false
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

  private isDisplayTxRequired (cltx: TxCollectionCUD<Doc, AttachedDoc>): boolean {
    // Check if collection attribute is hidden
    if (this.hiddenAttributes.has(cltx.collection)) {
      return false
    }
    const tx = TxProcessor.extractTx(cltx)
    if (
      [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc, core.class.TxMixin].includes(tx._class)
    ) {
      return true
    }
    return false
  }

  private readonly getUpdateTx = (tx: TxCUD<Doc>): TxUpdateDoc<Doc> | undefined => {
    if (this.hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
      const cltx = tx as TxCollectionCUD<Doc, AttachedDoc>
      tx = TxProcessor.extractTx(cltx) as TxCUD<Doc>
    }

    if (tx._class !== core.class.TxUpdateDoc) {
      return undefined
    }

    return tx as TxUpdateDoc<Doc>
  }

  filterUpdateTx (tx: TxCUD<Doc>): boolean {
    const utx = this.getUpdateTx(tx)

    if (utx === undefined) {
      return true
    }

    const ops = Object.keys(utx.operations)

    if (ops.length > 1) {
      return true
    }

    return !this.hiddenAttributes.has(ops[0])
  }

  createDisplayTx (tx: TxCUD<Doc>, parents: Map<Ref<Doc>, DisplayTx>, isOwnTx: boolean): [DisplayTx, boolean, boolean] {
    let collectionAttribute: Attribute<Collection<AttachedDoc>> | undefined
    const originTx = tx
    if (this.hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
      const cltx = tx as TxCollectionCUD<Doc, AttachedDoc>
      tx = TxProcessor.extractTx(cltx) as TxCUD<Doc>

      // Check mixin classes for desired attribute
      for (const cl of this.hierarchy.getDescendants(cltx.objectClass)) {
        try {
          collectionAttribute = this.hierarchy.findAttribute(cl, cltx.collection) as Attribute<Collection<AttachedDoc>>
          if (collectionAttribute !== undefined) {
            break
          }
        } catch (err: any) {
          // Ignore
        }
      }
    }
    let firstTx = parents.get(tx.objectId)
    const result: DisplayTx = newDisplayTx(tx, this.hierarchy, isOwnTx, originTx)

    result.collectionAttribute = collectionAttribute

    result.doc = firstTx?.doc ?? result.doc
    result.prevDoc = this.hierarchy.clone(result.doc)

    firstTx = firstTx ?? result
    parents.set(tx.objectId, firstTx)
    // If we have updates also apply them all.
    const isUpdated = this.checkUpdateState(result, firstTx)
    const isMixin = this.checkMixinState(result, firstTx)

    this.checkRemoveState(tx, firstTx, result)
    return [result, isUpdated, isMixin]
  }

  private checkRemoveState (tx: TxCUD<Doc>, firstTx: DisplayTx, result: DisplayTx): void {
    if (this.hierarchy.isDerived(tx._class, core.class.TxRemoveDoc)) {
      firstTx.removed = true
      result.removed = true
    }
  }

  checkUpdateState (result: DisplayTx, firstTx: DisplayTx): boolean {
    if (this.hierarchy.isDerived(result.tx._class, core.class.TxUpdateDoc) && result.doc !== undefined) {
      firstTx.doc = TxProcessor.updateDoc2Doc(result.doc, result.tx as TxUpdateDoc<Doc>)
      firstTx.updated = true
      result.updated = true
      return true
    }
    return false
  }

  checkMixinState (result: DisplayTx, firstTx: DisplayTx): boolean {
    if (this.hierarchy.isDerived(result.tx._class, core.class.TxMixin) && result.doc !== undefined) {
      const mix = result.tx as TxMixin<Doc, Doc>
      firstTx.doc = TxProcessor.updateMixin4Doc(result.doc, mix)
      firstTx.mixin = true
      result.mixin = true
      return true
    }
    return false
  }

  integrateTxWithResults (
    results: DisplayTx[],
    result: DisplayTx,
    editable: Map<Ref<Class<Doc>>, boolean>
  ): DisplayTx[] {
    const curUpdate: any = getCombineOpFromTx(result)

    if (curUpdate === undefined || (result.doc !== undefined && editable.get(result.doc._class) === true)) {
      results.push(result)
      return results
    }
    const newResults = results.filter((prevTx) => {
      const prevUpdate: any = getCombineOpFromTx(prevTx)
      if (this.isInitTx(prevTx, result)) {
        result = prevTx
        return false
      }

      // If same tx or same collection
      if (this.isSameKindTx(prevTx, result) || prevUpdate === curUpdate) {
        if (result.tx.modifiedOn - prevTx.tx.modifiedOn < combineThreshold && isEqualOps(prevUpdate, curUpdate)) {
          // we have same keys,
          // Remember previous transactions
          if (result.txDocIds === undefined) {
            result.txDocIds = new Set(prevTx.txDocIds)
          }
          if (prevTx.doc?._id !== undefined) {
            result.txDocIds?.add(prevTx.doc._id)
          }
          if (result.doc?._id !== undefined) {
            result.txDocIds?.add(result.doc._id)
          }
          result.txes.push(...prevTx.txes, prevTx)
          return false
        }
      }

      return true
    })

    newResults.push(result)
    return newResults
  }

  isInitTx (prevTx: DisplayTx, result: DisplayTx): boolean {
    if (prevTx.createTx !== undefined) {
      if (
        prevTx.tx.modifiedBy === result.tx.modifiedBy &&
        (result.tx.objectId === prevTx.createTx.objectId ||
          (result.doc as AttachedDoc)?.attachedTo === prevTx.createTx.objectId)
      ) {
        return result.tx.modifiedOn - prevTx.createTx.modifiedOn < createCombineThreshold
      }
    }
    return false
  }

  isSameKindTx (prevTx: DisplayTx, result: DisplayTx): boolean {
    return (
      prevTx.tx.objectId === result.tx.objectId && // Same document id
      prevTx.tx._class === result.tx._class && // Same transaction class
      prevTx.tx.modifiedBy === result.tx.modifiedBy // Same user
    )
  }
}

function getCombineOpFromTx (result: DisplayTx): any {
  let curUpdate: any
  if (result.tx._class === core.class.TxUpdateDoc) {
    curUpdate = (result.tx as unknown as TxUpdateDoc<Doc>).operations
  }
  if (result.tx._class === core.class.TxMixin) {
    curUpdate = (result.tx as unknown as TxMixin<Doc, Doc>).attributes
  }
  if (curUpdate === undefined && result.collectionAttribute !== undefined) {
    curUpdate = result.collectionAttribute.attributeOf + '.' + result.collectionAttribute.name
  }
  return curUpdate
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

/**
 * Construct an new activity, to listend for displayed transactions in UI.
 * @param client
 */
export function newActivity (client: Client, attributes: Map<string, AnyAttribute>): Activity {
  return new ActivityImpl(client, attributes)
}
