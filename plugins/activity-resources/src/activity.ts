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
 * Transaction being displayed.
 * @public
 */
export interface DisplayTx {
  // Source tx
  tx: TxCUD<Doc>

  // A set of collapsed transactions.
  txes: DisplayTx[]

  // type check for createTx
  createTx?: TxCreateDoc<Doc>

  // Type check for updateTx
  updateTx?: TxUpdateDoc<Doc>

  // Type check for updateTx
  mixinTx?: TxMixin<Doc, Doc>

  // Document in case it is required.
  doc?: Doc

  updated: boolean
  mixin: boolean
  removed: boolean

  collectionAttribute?: Attribute<Collection<AttachedDoc>>
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
  update: (object: Doc, listener: DisplayTxListener, sort: SortingOrder, editable: Map<Ref<Class<Doc>>, boolean>) => void
}

class ActivityImpl implements Activity {
  private readonly txQuery1: LiveQuery
  private readonly txQuery2: LiveQuery
  private readonly hiddenAttributes: Set<string>

  private txes1: Array<TxCUD<Doc>> = []
  private txes2: Array<TxCUD<Doc>> = []
  constructor (readonly client: Client, attributes: Map<string, AnyAttribute>) {
    this.hiddenAttributes = new Set(
      [...attributes.entries()].filter(([, value]) => value.hidden === true).map(([key]) => key)
    )
    this.txQuery1 = createQuery()
    this.txQuery2 = createQuery()
  }

  private notify (object: Doc, listener: DisplayTxListener, sort: SortingOrder, editable: Map<Ref<Class<Doc>>, boolean>): void {
    this.combineTransactions(object, this.txes1, this.txes2, editable).then(
      (result) => {
        const sorted = result.sort((a, b) => (a.tx.modifiedOn - b.tx.modifiedOn) * sort)
        listener(sorted)
      },
      (err) => {
        console.error(err)
      }
    )
  }

  update (object: Doc, listener: DisplayTxListener, sort: SortingOrder, editable: Map<Ref<Class<Doc>>, boolean>): void {
    let isAttached = false

    isAttached = this.client.getHierarchy().isDerived(object._class, core.class.AttachedDoc)

    this.txQuery1.query<TxCollectionCUD<Doc, AttachedDoc>>(
      isAttached ? core.class.TxCollectionCUD : core.class.TxCUD,
      isAttached
        ? { 'tx.objectId': object._id as Ref<AttachedDoc> }
        : {
            objectId: object._id,
            _class: {
              $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc, core.class.TxMixin]
            }
          },
      (result) => {
        this.txes1 = result
        this.notify(object, listener, sort, editable)
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
        this.notify(object, listener, sort, editable)
      },
      { sort: { modifiedOn: SortingOrder.Descending } }
    )
  }

  async combineTransactions (object: Doc, txes1: Array<TxCUD<Doc>>, txes2: Array<TxCUD<Doc>>, editable: Map<Ref<Class<Doc>>, boolean>): Promise<DisplayTx[]> {
    const hierarchy = this.client.getHierarchy()

    // We need to sort with with natural order, to build a proper doc values.
    const allTx = Array.from(txes1).concat(txes2).sort(this.sortByLastModified)
    const txCUD: Array<TxCUD<Doc>> = this.filterTxCUD(allTx, hierarchy)

    const parents = new Map<Ref<Doc>, DisplayTx>()

    let results: DisplayTx[] = []

    for (const tx of txCUD) {
      const { collectionCUD, updateCUD, mixinCUD, result, tx: ntx } = this.createDisplayTx(tx, parents)
      // We do not need collection object updates, in main list of displayed transactions.
      if (this.isDisplayTxRequired(collectionCUD, updateCUD || mixinCUD, ntx, object)) {
        // Combine previous update transaction for same field and if same operation and time treshold is ok
        results = this.integrateTxWithResults(results, result, editable)
        this.updateRemovedState(result, results)
      }
    }
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

  isDisplayTxRequired (collectionCUD: boolean, cudOp: boolean, ntx: TxCUD<Doc>, object: Doc): boolean {
    return !(collectionCUD && cudOp) || ntx.objectId === object._id
  }

  private readonly getUpdateTx = (tx: TxCUD<Doc>): TxUpdateDoc<Doc> | undefined => {
    if (tx._class !== core.class.TxCollectionCUD) {
      return undefined
    }

    const colTx = tx as TxCollectionCUD<Doc, any>

    if (colTx.tx._class !== core.class.TxUpdateDoc) {
      return undefined
    }

    return colTx.tx as TxUpdateDoc<Doc>
  }

  filterTxCUD (allTx: Array<TxCUD<Doc>>, hierarchy: Hierarchy): Array<TxCUD<Doc>> {
    return allTx
      .filter((tx) => hierarchy.isDerived(tx._class, core.class.TxCUD))
      .filter((tx) => {
        const utx = this.getUpdateTx(tx)

        if (utx === undefined) {
          return true
        }

        const ops = Object.keys(utx.operations)

        if (ops.length > 1) {
          return true
        }

        return !this.hiddenAttributes.has(ops[0])
      })
  }

  createDisplayTx (
    tx: TxCUD<Doc>,
    parents: Map<Ref<Doc>, DisplayTx>
  ): { collectionCUD: boolean, updateCUD: boolean, mixinCUD: boolean, result: DisplayTx, tx: TxCUD<Doc> } {
    let collectionCUD = false
    let updateCUD = false
    let mixinCUD = false
    const hierarchy = this.client.getHierarchy()

    let collectionAttribute: Attribute<Collection<AttachedDoc>> | undefined
    if (hierarchy.isDerived(tx._class, core.class.TxCollectionCUD)) {
      const cltx = tx as TxCollectionCUD<Doc, AttachedDoc>
      tx = getCollectionTx(cltx)

      // Check mixin classes for desired attribute
      for (const cl of hierarchy.getDescendants(cltx.objectClass)) {
        try {
          collectionAttribute = hierarchy.getAttribute(cl, cltx.collection) as Attribute<Collection<AttachedDoc>>
          if (collectionAttribute !== undefined) {
            break
          }
        } catch (err: any) {
          // Ignore
        }
      }
      collectionCUD = (cltx.tx._class === core.class.TxUpdateDoc) || (cltx.tx._class === core.class.TxMixin)
    }
    let firstTx = parents.get(tx.objectId)
    const result: DisplayTx = newDisplayTx(tx, hierarchy)
    result.collectionAttribute = collectionAttribute

    result.doc = firstTx?.doc ?? result.doc

    firstTx = firstTx ?? result
    parents.set(tx.objectId, firstTx)

    // If we have updates also apply them all.
    updateCUD = this.checkUpdateState(result, firstTx)
    mixinCUD = this.checkMixinState(result, firstTx)

    this.checkRemoveState(hierarchy, tx, firstTx, result)
    return { collectionCUD, updateCUD, mixinCUD, result, tx }
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

  checkMixinState (result: DisplayTx, firstTx: DisplayTx): boolean {
    if (this.client.getHierarchy().isDerived(result.tx._class, core.class.TxMixin) && result.doc !== undefined) {
      const mix = result.tx as TxMixin<Doc, Doc>
      firstTx.doc = TxProcessor.updateMixin4Doc(result.doc, mix.mixin, mix.attributes)
      firstTx.mixin = true
      result.mixin = true
      return true
    }
    return false
  }

  integrateTxWithResults (results: DisplayTx[], result: DisplayTx, editable: Map<Ref<Class<Doc>>, boolean>): DisplayTx[] {
    const curUpdate: any = getCombineOpFromTx(result)

    if (curUpdate === undefined || (result.doc !== undefined && editable.has(result.doc._class))) {
      results.push(result)
      return results
    }
    const newResult = results.filter((prevTx) => {
      const prevUpdate: any = getCombineOpFromTx(prevTx)
      // If same tx or same collection
      if (this.isSameKindTx(prevTx, result, result.tx._class) || (prevUpdate === curUpdate)) {
        if (result.tx.modifiedOn - prevTx.tx.modifiedOn < combineThreshold && isEqualOps(prevUpdate, curUpdate)) {
          // we have same keys,
          // Remember previous transactions
          result.txes.push(...prevTx.txes, prevTx)
          return false
        }
      }

      return true
    })
    newResult.push(result)
    return newResult
  }

  isSameKindTx (prevTx: DisplayTx, result: DisplayTx, _class: Ref<Class<Doc>>): boolean {
    return (
      prevTx.tx.objectId === result.tx.objectId && // Same document id
      prevTx.tx._class === result.tx._class && // Same transaction class
      result.tx._class === _class &&
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
  if (result.collectionAttribute !== undefined) {
    curUpdate = result.collectionAttribute.attributeOf + '.' + result.collectionAttribute.name
  }
  return curUpdate
}

export function newDisplayTx (tx: TxCUD<Doc>, hierarchy: Hierarchy): DisplayTx {
  const createTx = hierarchy.isDerived(tx._class, core.class.TxCreateDoc) ? (tx as TxCreateDoc<Doc>) : undefined
  return {
    tx,
    txes: [],
    createTx,
    updateTx: hierarchy.isDerived(tx._class, core.class.TxUpdateDoc) ? (tx as TxUpdateDoc<Doc>) : undefined,
    updated: false,
    removed: false,
    mixin: false,
    mixinTx: hierarchy.isDerived(tx._class, core.class.TxMixin) ? (tx as TxMixin<Doc, Doc>) : undefined,
    doc: createTx !== undefined ? TxProcessor.createDoc2Doc(createTx) : undefined
  }
}

export function getCollectionTx (cltx: TxCollectionCUD<Doc, AttachedDoc>): TxCUD<Doc> {
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
