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
  type AnyAttribute,
  type Class,
  type Client,
  type Doc,
  DocManager,
  type DocumentQuery,
  type Hierarchy,
  type Ref,
  SortingOrder,
  type Space,
  type Tx,
  type WithLookup,
  matchQuery
} from '@hcengineering/core'
import { LiveQuery } from '@hcengineering/query'
import { type Component } from '@hcengineering/tracker'
import { type IAggregationManager, type GrouppingManager } from '@hcengineering/view'
import { get, writable } from 'svelte/store'

export const componentStore = writable<DocManager<Component>>(new DocManager([]))

/**
 * @public
 */
export class AggregationManager<T extends Doc> implements IAggregationManager<T> {
  docs: T[] | undefined
  mgr: DocManager<T> | Promise<DocManager<T>> | undefined
  query: (() => void) | undefined
  lq: LiveQuery
  lqCallback: () => void
  private readonly setStore: (manager: DocManager<T>) => void
  private readonly filter: (doc: T, target: T) => boolean
  private readonly _class: Ref<Class<T>>

  private constructor (
    client: Client,
    lqCallback: () => void,
    setStore: (manager: DocManager<T>) => void,
    categorizingFunc: (doc: T, target: T) => boolean,
    _class: Ref<Class<T>>
  ) {
    this.lq = new LiveQuery(client)
    this.lqCallback = lqCallback ?? (() => {})
    this.setStore = setStore
    this.filter = categorizingFunc
    this._class = _class
    void this.getManager()
  }

  static create<T extends Doc>(
    client: Client,
    lqCallback: () => void,
    setStore: (manager: DocManager<T>) => void,
    categorizingFunc: (doc: T, target: T) => boolean,
    _class: Ref<Class<T>>
  ): AggregationManager<T> {
    return new AggregationManager<T>(client, lqCallback, setStore, categorizingFunc, _class)
  }

  private async getManager (): Promise<DocManager<T>> {
    if (this.mgr !== undefined) {
      if (this.mgr instanceof Promise) {
        this.mgr = await this.mgr
      }
      return this.mgr
    }
    this.mgr = new Promise<DocManager<T>>((resolve) => {
      this.query = this.lq.query(
        this._class,
        {},
        (res) => {
          const first = this.docs === undefined
          this.docs = res
          this.mgr = new DocManager<T>(res as T[]) // Fix: Specify the type as `Component`
          this.setStore(this.mgr)
          // store.set(this.mgr as DocManager<any>)
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

  async notifyTx (...tx: Tx[]): Promise<void> {
    await this.lq.tx(...tx)
  }

  getAttrClass (): Ref<Class<T>> {
    return this._class
  }

  async categorize (target: Array<Ref<T>>, attr: AnyAttribute): Promise<Array<Ref<T>>> {
    const mgr = await this.getManager()
    for (const sid of [...target]) {
      const c = mgr.getIdMap().get(sid) as WithLookup<T>
      if (c !== undefined) {
        let components = mgr.getDocs()

        // components = components.filter(
        // (it: T) => it.label.toLowerCase().trim() === c.label.toLowerCase().trim() && it._id !== c._id
        // )
        components = components.filter((it: T) => this.filter(it, c))
        target.push(...components.map((it) => it._id))
      }
    }
    return target.filter((it, idx, arr) => arr.indexOf(it) === idx)
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
  // console.log('mgr docs', mgr.getDocs())
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
