import {
  type Class,
  type Doc,
  type DocData,
  type Ref,
  SortingOrder,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import { onDestroy } from 'svelte'
import { type Writable, writable } from 'svelte/store'
import { type LiveQuery } from '../..'
import presentation from '../../plugin'
import { type DocCreateExtension } from '../../types'
import { createQuery } from '../../utils'

export class DocCreateExtensionManager {
  query: LiveQuery
  _extensions: DocCreateExtension[] = []
  extensions: Writable<DocCreateExtension[]> = writable([])
  states = new Map<Ref<DocCreateExtension>, Writable<any>>()

  static create (_class: Ref<Class<Doc>>): DocCreateExtensionManager {
    const mgr = new DocCreateExtensionManager(_class)
    onDestroy(() => {
      mgr.close()
    })
    return mgr
  }

  getState (ref: Ref<DocCreateExtension>): Writable<any> {
    let state = this.states.get(ref)
    if (state === undefined) {
      state = writable({})
      this.states.set(ref, state)
    }
    return state
  }

  private constructor (readonly _class: Ref<Class<Doc>>) {
    this.query = createQuery()
    this.query.query(
      presentation.class.DocCreateExtension,
      { ofClass: _class },
      (res) => {
        this._extensions = res
        this.extensions.set(res)
      },
      { sort: { ofClass: SortingOrder.Ascending } }
    )
  }

  async commit (ops: TxOperations, docId: Ref<Doc>, space: Ref<Space>, data: DocData<Doc>): Promise<void> {
    for (const e of this._extensions) {
      const applyOp = await getResource(e.apply)
      await applyOp?.(ops, docId, space, data, this.getState(e._id))
    }
  }

  close (): void {
    this.query.unsubscribe()
  }
}
