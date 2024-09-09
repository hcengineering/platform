import {
  AttachedDoc,
  Class,
  Doc,
  Mixin,
  Ref,
  SortingOrder,
  TxCollectionCUD,
  TxCUD,
  TxMixin,
  TxUpdateDoc
} from '@hcengineering/core'
import core from '@hcengineering/core/src/component'
import { DocObjectCache, type ActivityControl } from './types'

export async function getAllObjectTransactions (
  control: Pick<ActivityControl, 'hierarchy' | 'findAll' | 'ctx'>,
  _class: Ref<Class<Doc>>,
  docs: Ref<Doc>[],
  mixin?: Ref<Mixin<Doc>>
): Promise<DocObjectCache['transactions']> {
  const cache: DocObjectCache['transactions'] = new Map()
  const hierarchy = control.hierarchy
  const isAttached = hierarchy.isDerived(_class, core.class.AttachedDoc)

  const ownTxes = await control.findAll<TxCUD<Doc>>(
    control.ctx,
    isAttached ? core.class.TxCollectionCUD : core.class.TxCUD,
    isAttached
      ? { 'tx.objectId': { $in: docs as Ref<AttachedDoc>[] } }
      : {
          objectId: { $in: docs },
          _class: {
            $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc, core.class.TxMixin]
          }
        },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of ownTxes) {
    const id = isAttached ? (tx as TxCollectionCUD<Doc, AttachedDoc>).tx.objectId : tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const collectionTxes = await control.findAll<TxCollectionCUD<Doc, AttachedDoc>>(
    control.ctx,
    core.class.TxCollectionCUD,
    {
      objectId: { $in: docs },
      'tx._class': { $in: [core.class.TxCreateDoc, core.class.TxUpdateDoc, core.class.TxRemoveDoc] }
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of collectionTxes) {
    const id = tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const mixinTxes = isAttached
    ? await control.findAll<TxMixin<Doc, Doc>>(
      control.ctx,
      core.class.TxMixin,
      {
        objectId: { $in: docs },
        ...(mixin !== undefined ? { mixin } : {})
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )
    : []

  for (const tx of mixinTxes) {
    const id = tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const moveCollection = await control.findAll<TxCollectionCUD<Doc, AttachedDoc>>(
    control.ctx,
    core.class.TxCollectionCUD,
    {
      'tx.operations.attachedTo': { $in: docs },
      'tx._class': core.class.TxUpdateDoc
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of moveCollection) {
    const id = ((tx as TxCollectionCUD<Doc, AttachedDoc>).tx as TxUpdateDoc<AttachedDoc>).operations
      .attachedTo as Ref<Doc>
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  for (const d of docs) {
    cache.set(
      d,
      (cache.get(d) ?? [])
        .sort((a, b) => a.modifiedOn - b.modifiedOn)
        .filter((it, idx, arr) => arr.findIndex((q) => q._id === it._id) === idx)
    )
  }

  return cache
}
