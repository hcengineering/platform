//
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { writable } from 'svelte/store'

import core, {
  AnyAttribute,
  Attribute,
  Class,
  Client,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  generateId,
  Hierarchy,
  Ref,
  RefTo,
  SortingOrder,
  Tx,
  TxResult
} from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import tracker, { Component, ComponentManager } from '@hcengineering/tracker'

import { BasePresentationMiddleware, PresentationMiddleware } from './pipeline'

export const componentStore = writable<ComponentManager>(new ComponentManager([]))

interface ComponentSubscriber<T extends Doc = Doc> {
  attributes: Array<Ref<AnyAttribute>>

  _class: Ref<Class<T>>
  query: DocumentQuery<T>
  options?: FindOptions<T>

  refresh: () => void
}

/**
 * @public
 */
export class ComponentMiddleware extends BasePresentationMiddleware implements PresentationMiddleware {
  mgr: ComponentManager | Promise<ComponentManager> | undefined
  component: Component[] | undefined
  componentQuery: (() => void) | undefined
  lq: LiveQuery

  subscribers: Map<string, ComponentSubscriber> = new Map()
  private constructor (client: Client, next?: PresentationMiddleware) {
    super(client, next)
    this.lq = new LiveQuery(client)
  }

  async notifyTx (tx: Tx): Promise<void> {
    await this.lq.tx(tx)
    await this.provideNotifyTx(tx)
  }

  async close (): Promise<void> {
    this.componentQuery?.()
    return await this.provideClose()
  }

  async getManager (): Promise<ComponentManager> {
    if (this.mgr !== undefined) {
      if (this.mgr instanceof Promise) {
        this.mgr = await this.mgr
      }
      return this.mgr
    }
    this.mgr = new Promise<ComponentManager>((resolve) => {
      this.componentQuery = this.lq.query(
        tracker.class.Component,
        {},
        (res) => {
          const first = this.component === undefined
          this.component = res
          this.mgr = new ComponentManager(res)
          componentStore.set(this.mgr)
          if (!first) {
            this.refreshSubscribers()
          }
          resolve(this.mgr)
        },
        {
          sort: {
            label: SortingOrder.Ascending
          }
        }
      )
    })

    return await this.mgr
  }

  private refreshSubscribers (): void {
    for (const s of this.subscribers.values()) {
      // TODO: Do something more smart and track if used component field is changed.
      s.refresh()
    }
  }

  async subscribe<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options: FindOptions<T> | undefined,
    refresh: () => void
  ): Promise<{
      unsubscribe: () => void
      query?: DocumentQuery<T>
      options?: FindOptions<T>
    }> {
    const ret = await this.provideSubscribe(_class, query, options, refresh)
    const h = this.client.getHierarchy()

    const id = generateId()
    const s: ComponentSubscriber<T> = {
      _class,
      query,
      refresh,
      options,
      attributes: []
    }
    const componentFields: Array<Attribute<Component>> = []
    const allAttrs = h.getAllAttributes(_class)

    const updatedQuery: DocumentQuery<T> = { ...(ret.query ?? query) }
    const finalOptions = { ...(ret.options ?? options ?? {}) }

    await this.updateQueryOptions<T>(allAttrs, h, componentFields, updatedQuery, finalOptions)

    if (componentFields.length > 0) {
      this.subscribers.set(id, s)
      return {
        unsubscribe: () => {
          ret.unsubscribe()
          this.subscribers.delete(id)
        },
        query: updatedQuery,
        options: finalOptions
      }
    }
    return { unsubscribe: (await ret).unsubscribe }
  }

  static create (client: Client, next?: PresentationMiddleware): ComponentMiddleware {
    return new ComponentMiddleware(client, next)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<FindResult<T>> {
    const componentFields: Array<Attribute<Component>> = []
    const h = this.client.getHierarchy()
    const allAttrs = h.getAllAttributes(_class)
    const finalOptions = options ?? {}

    await this.updateQueryOptions<T>(allAttrs, h, componentFields, query, finalOptions)

    const result = await this.provideFindAll(_class, query, finalOptions)
    // We need to add $
    if (componentFields.length > 0) {
      // We need to update $lookup for component fields and provide $component group fields.
      for (const attr of componentFields) {
        for (const r of result) {
          const resultDoc = Hierarchy.toDoc(r)
          if (resultDoc.$lookup === undefined) {
            resultDoc.$lookup = {}
          }

          // TODO: Check for mixin?
          const stateValue = (r as any)[attr.name]
          const component = (await this.getManager()).byId.get(stateValue)
          if (component !== undefined) {
            ;(resultDoc.$lookup as any)[attr.name] = component
          }
        }
      }
    }
    return result
  }

  private categorizeComponent (
    mgr: ComponentManager,
    attr: AnyAttribute,
    target: Array<Ref<Component>>
  ): Array<Ref<Component>> {
    for (const componentId of [...target]) {
      const component = mgr.byId.get(componentId)
      if (component !== undefined) {
        const components = mgr.components.filter(
          (it) => it.label.toLowerCase().trim() === component.label.toLowerCase().trim() && it._id !== component._id
        )
        target.push(...components.map((it) => it._id))
      }
    }
    return target.filter((it, idx, arr) => arr.indexOf(it) === idx)
  }

  private async updateQueryOptions<T extends Doc>(
    allAttrs: Map<string, AnyAttribute>,
    h: Hierarchy,
    componentFields: Array<Attribute<Component>>,
    query: DocumentQuery<T>,
    finalOptions: FindOptions<T>
  ): Promise<void> {
    for (const attr of allAttrs.values()) {
      try {
        if (
          attr.type._class === core.class.RefTo &&
          h.isDerived((attr.type as RefTo<Doc>).to, tracker.class.Component)
        ) {
          const mgr = await this.getManager()
          let target: Array<Ref<Component>> = []
          let targetNin: Array<Ref<Component>> = []
          componentFields.push(attr)
          const v = (query as any)[attr.name]

          if (v != null) {
            // Only add filter if we have filer inside.
            if (typeof v === 'string') {
              target.push(v as Ref<Component>)
            } else {
              if (v.$in !== undefined) {
                target.push(...v.$in)
              } else if (v.$nin !== undefined) {
                targetNin.push(...v.$nin)
              } else if (v.$ne !== undefined) {
                targetNin.push(v.$ne)
              }
            }

            // Find all similar name components for same attribute name.
            target = this.categorizeComponent(mgr, attr, target)
            targetNin = this.categorizeComponent(mgr, attr, targetNin)
            if (target.length > 0 || targetNin.length > 0) {
              ;(query as any)[attr.name] = {}
              if (target.length > 0) {
                ;(query as any)[attr.name].$in = target
              }
              if (targetNin.length > 0) {
                ;(query as any)[attr.name].$nin = targetNin
              }
            }
          }
          if (finalOptions.lookup !== undefined) {
            // Remove lookups by component field
            if ((finalOptions.lookup as any)[attr.name] !== undefined) {
              const { [attr.name]: _, ...newLookup } = finalOptions.lookup as any
              finalOptions.lookup = newLookup
            }
          }
        }
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.provideTx(tx)
  }
}
