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
  Class,
  Doc,
  DocManager,
  FindOptions,
  Ref,
  SortingOrder,
  Space,
  WithLookup
} from '@hcengineering/core'
import tracker, { Component, ComponentManager } from '@hcengineering/tracker'
import { get, Writable, writable } from 'svelte/store'

export const componentStore = writable<ComponentManager>(new ComponentManager([]))

/**
 * @public
 */
export function getComponentManager (docs: Doc[]): ComponentManager {
  return new ComponentManager(docs)
}

/**
 * @public
 */
export function getComponentStore (): Writable<DocManager> {
  return componentStore
}

/**
 * @public
 */
export function getComponentFindOptions (): FindOptions<Component> {
  return {
    sort: {
      label: SortingOrder.Ascending
    }
  }
}

/**
 * @public
 */
export const getComponentClass = (): Ref<Class<Doc>> => tracker.class.Component

/**
 * @public
 */
export function componentCategorize (mgr: DocManager, attr: AnyAttribute, target: Array<Ref<Doc>>): Array<Ref<Doc>> {
  for (const sid of [...target]) {
    const s = mgr.getIdMap().get(sid) as WithLookup<Component>
    if (s !== undefined) {
      let components = mgr.getDocs() as Array<WithLookup<Component>>
      components = components.filter(
        (it) => it.label.toLowerCase().trim() === s.label.toLowerCase().trim() && it._id !== s._id
      )
      target.push(...components.map((it) => it._id))
    }
  }
  return target.filter((it, idx, arr) => arr.indexOf(it) === idx)
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
export const groupComponentValues = (val: Component[], targets: Set<any>): Doc[] => {
  const values = val
  const result: Doc[] = []
  const unique = [...new Set(val.map((v) => v.label.trim().toLocaleLowerCase()))]
  unique.forEach((label, i) => {
    let exists = false
    values.forEach((state) => {
      if (state.label.trim().toLocaleLowerCase() === label) {
        if (!exists) {
          result[i] = state
          exists = targets.has(state?._id)
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
