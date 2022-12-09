import { DocumentUpdate, Hierarchy, MixinData, MixinUpdate, ModelDb } from '.'
import type { Account, AttachedData, AttachedDoc, Class, Data, Doc, Mixin, Ref, Space, Timestamp } from './classes'
import { Client } from './client'
import core from './component'
import type { DocumentQuery, FindOptions, FindResult, TxResult, WithLookup } from './storage'
import { DocumentClassQuery, Tx, TxCUD, TxFactory } from './tx'

/**
 * @public
 *
 * High Level operations with client, will create low level transactions.
 *
 * `notify` is not supported by TxOperations.
 */
export class TxOperations implements Omit<Client, 'notify'> {
  readonly txFactory: TxFactory

  constructor (readonly client: Client, readonly user: Ref<Account>) {
    this.txFactory = new TxFactory(user)
  }

  getHierarchy (): Hierarchy {
    return this.client.getHierarchy()
  }

  getModel (): ModelDb {
    return this.client.getModel()
  }

  async close (): Promise<void> {
    return await this.client.close()
  }

  findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    return this.client.findAll(_class, query, options)
  }

  findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<WithLookup<T> | undefined> {
    return this.client.findOne(_class, query, options)
  }

  tx (tx: Tx): Promise<TxResult> {
    return this.client.tx(tx)
  }

  async createDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    attributes: Data<T>,
    id?: Ref<T>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<Ref<T>> {
    const tx = this.txFactory.createTxCreateDoc(_class, space, attributes, id, modifiedOn, modifiedBy)
    await this.client.tx(tx)
    return tx.objectId
  }

  async addCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: string,
    attributes: AttachedData<P>,
    id?: Ref<P>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<Ref<P>> {
    const tx = this.txFactory.createTxCollectionCUD<T, P>(
      attachedToClass,
      attachedTo,
      space,
      collection,
      this.txFactory.createTxCreateDoc<P>(_class, space, attributes as unknown as Data<P>, id, modifiedOn, modifiedBy)
    )
    await this.client.tx(tx)
    return tx.tx.objectId as unknown as Ref<P>
  }

  async updateCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: string,
    operations: DocumentUpdate<P>,
    retrieve?: boolean,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<Ref<T>> {
    const tx = this.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      this.txFactory.createTxUpdateDoc(_class, space, objectId, operations, retrieve, modifiedOn, modifiedBy)
    )
    await this.client.tx(tx)
    return tx.objectId
  }

  async removeCollection<T extends Doc, P extends AttachedDoc>(
    _class: Ref<Class<P>>,
    space: Ref<Space>,
    objectId: Ref<P>,
    attachedTo: Ref<T>,
    attachedToClass: Ref<Class<T>>,
    collection: string,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<Ref<T>> {
    const tx = this.txFactory.createTxCollectionCUD(
      attachedToClass,
      attachedTo,
      space,
      collection,
      this.txFactory.createTxRemoveDoc(_class, space, objectId, modifiedOn, modifiedBy)
    )
    await this.client.tx(tx)
    return tx.objectId
  }

  updateDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    operations: DocumentUpdate<T>,
    retrieve?: boolean,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxUpdateDoc(_class, space, objectId, operations, retrieve, modifiedOn, modifiedBy)
    return this.client.tx(tx)
  }

  removeDoc<T extends Doc>(
    _class: Ref<Class<T>>,
    space: Ref<Space>,
    objectId: Ref<T>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxRemoveDoc(_class, space, objectId, modifiedOn, modifiedBy)
    return this.client.tx(tx)
  }

  createMixin<D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    objectSpace: Ref<Space>,
    mixin: Ref<Mixin<M>>,
    attributes: MixinData<D, M>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxMixin(
      objectId,
      objectClass,
      objectSpace,
      mixin,
      attributes,
      modifiedOn,
      modifiedBy
    )
    return this.client.tx(tx)
  }

  updateMixin<D extends Doc, M extends D>(
    objectId: Ref<D>,
    objectClass: Ref<Class<D>>,
    objectSpace: Ref<Space>,
    mixin: Ref<Mixin<M>>,
    attributes: MixinUpdate<D, M>,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<TxResult> {
    const tx = this.txFactory.createTxMixin(
      objectId,
      objectClass,
      objectSpace,
      mixin,
      attributes,
      modifiedOn,
      modifiedBy
    )
    return this.client.tx(tx)
  }

  update<T extends Doc>(
    doc: T,
    update: DocumentUpdate<T>,
    retrieve?: boolean,
    modifiedOn?: Timestamp,
    modifiedBy?: Ref<Account>
  ): Promise<TxResult> {
    const hierarchy = this.client.getHierarchy()
    if (hierarchy.isMixin(doc._class)) {
      const baseClass = hierarchy.getBaseClass(doc._class)
      return this.updateMixin(doc._id, baseClass, doc.space, doc._class, update, modifiedOn, modifiedBy)
    }
    if (hierarchy.isDerived(doc._class, core.class.AttachedDoc)) {
      const adoc = doc as unknown as AttachedDoc
      return this.updateCollection(
        doc._class,
        doc.space,
        adoc._id,
        adoc.attachedTo,
        adoc.attachedToClass,
        adoc.collection,
        update,
        retrieve,
        modifiedOn,
        modifiedBy
      )
    }
    return this.updateDoc(doc._class, doc.space, doc._id, update, retrieve, modifiedOn, modifiedBy)
  }

  remove<T extends Doc>(doc: T, modifiedOn?: Timestamp, modifiedBy?: Ref<Account>): Promise<TxResult> {
    if (this.client.getHierarchy().isDerived(doc._class, core.class.AttachedDoc)) {
      const adoc = doc as unknown as AttachedDoc
      return this.removeCollection(
        doc._class,
        doc.space,
        adoc._id,
        adoc.attachedTo,
        adoc.attachedToClass,
        adoc.collection,
        modifiedOn,
        modifiedBy
      )
    }
    return this.removeDoc(doc._class, doc.space, doc._id)
  }

  apply (scope: string): ApplyOperations {
    return new ApplyOperations(this, scope)
  }
}

/**
 * @public
 *
 * Builder for ApplyOperation, with same syntax as TxOperations.
 *
 * Will send real command on commit and will return boolean of operation success.
 */
export class ApplyOperations extends TxOperations {
  txes: TxCUD<Doc>[] = []
  matches: DocumentClassQuery<Doc>[] = []
  constructor (readonly ops: TxOperations, readonly scope: string) {
    const txClient: Client = {
      getHierarchy: () => ops.client.getHierarchy(),
      getModel: () => ops.client.getModel(),
      close: () => ops.client.close(),
      findOne: (_class, query, options?) => ops.client.findOne(_class, query, options),
      findAll: (_class, query, options?) => ops.client.findAll(_class, query, options),
      tx: async (tx): Promise<TxResult> => {
        if (ops.getHierarchy().isDerived(tx._class, core.class.TxCUD)) {
          this.txes.push(tx as TxCUD<Doc>)
        }
        return {}
      }
    }
    super(txClient, ops.user)
  }

  match<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>): ApplyOperations {
    this.matches.push({ _class, query })
    return this
  }

  async commit (): Promise<boolean> {
    return await ((await this.ops.tx(
      this.ops.txFactory.createTxApplyIf(core.space.Tx, this.scope, this.matches, this.txes)
    )) as Promise<boolean>)
  }
}
