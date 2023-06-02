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

import {
  AggregateValue,
  AggregateValueData,
  AnyAttribute,
  Attribute,
  Class,
  Client,
  Doc,
  DocumentQuery,
  Hierarchy,
  Ref,
  SortingOrder,
  Space,
  Tx,
  WithLookup,
  matchQuery
} from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import tracker, { Component, ComponentManager } from '@hcengineering/tracker'
import { AggregationManager, GrouppingManager } from '@hcengineering/view'
import { get, writable } from 'svelte/store'

export const componentStore = writable<ComponentManager>(new ComponentManager([]))

/**
 * @public
 */
export class ComponentAggregationManager implements AggregationManager {
  docs: Doc[] | undefined
  mgr: ComponentManager | Promise<ComponentManager> | undefined
  query: (() => void) | undefined
  lq: LiveQuery
  lqCallback: () => void

  private constructor (client: Client, lqCallback: () => void) {
    this.lq = new LiveQuery(client)
    this.lqCallback = lqCallback ?? (() => {})
  }

  static create (client: Client, lqCallback: () => void): ComponentAggregationManager {
    return new ComponentAggregationManager(client, lqCallback)
  }

  private async getManager (): Promise<ComponentManager> {
    if (this.mgr !== undefined) {
      if (this.mgr instanceof Promise) {
        this.mgr = await this.mgr
      }
      return this.mgr
    }
    this.mgr = new Promise<ComponentManager>((resolve) => {
      this.query = this.lq.query(
        tracker.class.Component,
        {},
        (res) => {
          const first = this.docs === undefined
          this.docs = res
          this.mgr = new ComponentManager(res)
          componentStore.set(this.mgr)
          if (!first) {
            this.lqCallback()
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

  close (): void {
    this.query?.()
  }

  async notifyTx (tx: Tx): Promise<void> {
    await this.lq.tx(tx)
  }

  getAttrClass (): Ref<Class<Doc>> {
    return tracker.class.Component
  }

  async categorize (target: Array<Ref<Doc>>, attr: AnyAttribute): Promise<Array<Ref<Doc>>> {
    const mgr = await this.getManager()
    for (const sid of [...target]) {
      const c = mgr.getIdMap().get(sid as Ref<Component>) as WithLookup<Component>
      if (c !== undefined) {
        let components = mgr.getDocs()
        components = components.filter(
          (it) => it.label.toLowerCase().trim() === c.label.toLowerCase().trim() && it._id !== c._id
        )
        target.push(...components.map((it) => it._id))
      }
    }
    return target.filter((it, idx, arr) => arr.indexOf(it) === idx)
  }

  async updateLookup (resultDoc: WithLookup<Doc>, attr: Attribute<Doc>): Promise<void> {
    const value = (resultDoc as any)[attr.name]
    const doc = (await this.getManager()).getIdMap().get(value)
    if (doc !== undefined) {
      ;(resultDoc.$lookup as any)[attr.name] = doc
    }
  }
}

/**
 * @public
 */
export const grouppingComponentManager: GrouppingManager = {
  groupByCategories: groupByComponentCategories,
  groupValues: groupComponentValues,
  groupValuesWithEmpty: groupComponentValuesWithEmpty,
  hasValue: hasComponentValue
}

/**
 * @public
 */
export function groupByComponentCategories (categories: any[]): AggregateValue[] {
  const mgr = get(componentStore)

  const existingCategories: AggregateValue[] = [new AggregateValue(undefined, [])]
  const componentMap = new Map<string, AggregateValue>()

  const usedSpaces = new Set<Ref<Space>>()
  const componentsList: Array<WithLookup<Component>> = []
  for (const v of categories) {
    const component = mgr.getIdMap().get(v)
    if (component !== undefined) {
      componentsList.push(component)
      usedSpaces.add(component.space)
    }
  }

  for (const component of componentsList) {
    if (component !== undefined) {
      let fst = componentMap.get(component.label.toLowerCase().trim())
      if (fst === undefined) {
        const components = mgr
          .getDocs()
          .filter(
            (it) =>
              it.label.toLowerCase().trim() === component.label.toLowerCase().trim() &&
              (categories.includes(it._id) || usedSpaces.has(it.space))
          )
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((it) => new AggregateValueData(it.label, it._id, it.space))
        fst = new AggregateValue(component.label, components)
        componentMap.set(component.label.toLowerCase().trim(), fst)
        existingCategories.push(fst)
      }
    }
  }
  return existingCategories
}

/**
 * @public
 */
export function groupComponentValues (val: Doc[], targets: Set<any>): Doc[] {
  const values = val
  const result: Doc[] = []
  const unique = [...new Set(val.map((c) => (c as Component).label.trim().toLocaleLowerCase()))]
  unique.forEach((label, i) => {
    let exists = false
    values.forEach((c) => {
      if ((c as Component).label.trim().toLocaleLowerCase() === label) {
        if (!exists) {
          result[i] = c
          exists = targets.has(c?._id)
        }
      }
    })
  })
  return result
}

/**
 * @public
 */
export function hasComponentValue (value: Doc | undefined | null, values: any[]): boolean {
  const mgr = get(componentStore)
  const componentSet = new Set(
    mgr
      .filter((it) => it.label.trim().toLocaleLowerCase() === (value as Component)?.label?.trim()?.toLocaleLowerCase())
      .map((it) => it._id)
  )
  return values.some((it) => componentSet.has(it))
}

/**
 * @public
 */
export function groupComponentValuesWithEmpty (
  hierarchy: Hierarchy,
  _class: Ref<Class<Doc>>,
  key: string,
  query: DocumentQuery<Doc> | undefined
): Array<Ref<Doc>> {
  const mgr = get(componentStore)
  // We do not need extensions for all status categories.
  let componentsList = mgr.getDocs()
  if (query !== undefined) {
    const { [key]: st, space } = query
    const resQuery: DocumentQuery<Doc> = {}
    if (space !== undefined) {
      resQuery.space = space
    }
    if (st !== undefined) {
      resQuery._id = st
    }
    componentsList = matchQuery<Doc>(componentsList, resQuery, _class, hierarchy) as unknown as Array<
    WithLookup<Component>
    >
  }
  return componentsList.map((it) => it._id)
}
