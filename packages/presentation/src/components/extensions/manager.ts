import {
  SortingOrder,
  type Class,
  type Doc,
  type DocData,
  type Ref,
  type Space,
  type TxOperations
} from '@hcengineering/core'
import { getResource, OK, type Status } from '@hcengineering/platform'
import { onDestroy } from 'svelte'
import { derived, get, writable, type Writable } from 'svelte/store'
import { type LiveQuery } from '../..'
import presentation from '../../plugin'
import { type DocCreatePhase, type DocCreateExtension } from '../../types'
import { createQuery } from '../../utils'

export class DocCreateExtensionManager {
  query: LiveQuery
  _extensions: DocCreateExtension[] = []
  extensions: Writable<DocCreateExtension[]> = writable([])
  states = new Map<Ref<DocCreateExtension>, Writable<any>>()
  errors = writable<Record<Ref<DocCreateExtension>, Status>>({})

  status = derived(this.errors, (it) => Object.values(it).find((p) => p !== OK) ?? OK)

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

  setErrors (ref: Ref<DocCreateExtension>, error: Status): void {
    const errors = get(this.errors)
    errors[ref] = error
    this.errors.set(errors)
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

  async commit (
    ops: TxOperations,
    docId: Ref<Doc>,
    space: Space,
    data: DocData<Doc>,
    phase: DocCreatePhase
  ): Promise<void> {
    for (const e of this._extensions) {
      const state = get(this.getState(e._id))
      const applyOp = await getResource(e.apply)
      await applyOp?.(ops, docId, space, data, state, phase)
    }
  }

  async getAnalyticsProps (space: Space, data: DocData<Doc>): Promise<Record<string, string>> {
    let result: Record<string, string> = {}
    for (const e of this._extensions) {
      if (e.getAnalyticsProps === undefined) continue
      const state = get(this.getState(e._id))
      const fn = await getResource(e.getAnalyticsProps)
      const props = fn?.(space, data, state)

      result = { ...result, ...props }
    }

    return result
  }

  close (): void {
    this.query.unsubscribe()
  }
}
