import { AttachedDoc, Class, Doc, Mixin, Ref, SortingOrder, TxCUD, TxMixin, TxUpdateDoc } from '@hcengineering/core'
import core from '@hcengineering/core/src/component'
import { DocObjectCache, type ActivityControl } from './types'

export async function getAllObjectTransactions (
  control: Pick<ActivityControl, 'hierarchy' | 'findAll' | 'ctx'>,
  _class: Ref<Class<Doc>>,
  docs: Ref<Doc>[],
  mixin?: Ref<Mixin<Doc>>
): Promise<DocObjectCache['transactions']> {
  const cache: DocObjectCache['transactions'] = new Map()

  const ownTxes = await control.findAll<TxCUD<Doc>>(
    control.ctx,
    core.class.TxCUD,
    {
      objectId: { $in: docs }
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of ownTxes) {
    if (mixin !== undefined && tx._class === core.class.TxMixin && (tx as TxMixin<Doc, Doc>).mixin !== mixin) continue
    const id = tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const collectionTxes = await control.findAll<TxCUD<AttachedDoc>>(
    control.ctx,
    core.class.TxCUD,
    {
      attachedTo: { $in: docs }
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of collectionTxes) {
    const id = tx.objectId
    cache.set(id, [...(cache.get(id) ?? []), tx])
  }

  const moveCollection = await control.findAll<TxCUD<AttachedDoc>>(
    control.ctx,
    core.class.TxUpdateDoc,
    {
      'operations.attachedTo': { $in: docs }
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )

  for (const tx of moveCollection) {
    const id = (tx as TxUpdateDoc<AttachedDoc>).operations.attachedTo as Ref<Doc>
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
