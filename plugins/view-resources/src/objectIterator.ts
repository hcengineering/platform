//
// Copyright © 2024 Hardcore Engineering Inc.
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
import type { DocumentQuery, Doc, Ref, Class } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'

export interface IteratorState<T extends Doc> {
  query: DocumentQuery<T>
  currentObjects: T[]
  iteratorIndex: number
  limit: number
}

export interface StoreAdapter<T extends Doc> {
  set: (value: IteratorState<T>) => void
  update: (updater: (value: IteratorState<T>) => IteratorState<T>) => void
  get: () => IteratorState<T>
}

export function getDefaultIteratorState<T extends Doc> (query: DocumentQuery<T>): IteratorState<T> {
  return {
    query,
    currentObjects: [],
    iteratorIndex: 0,
    limit: 100
  }
}

export class ObjectIterator<T extends Doc> {
  private readonly storeAdapter: StoreAdapter<T>
  private readonly class: Ref<Class<T>>

  constructor (_class: Ref<Class<T>>, query: DocumentQuery<T>, storeAdapter: StoreAdapter<T>) {
    this.class = _class
    this.storeAdapter = storeAdapter
    this.storeAdapter.set(getDefaultIteratorState<T>(query))
  }

  async loadObjects (currentObject: Ref<Doc> | undefined): Promise<void> {
    const client = getClient()
    const { query, limit } = this.storeAdapter.get()
    const testResults = await client.findAll(this.class, query, {
      limit,
      total: true
    })
    this.storeAdapter.update((store) => {
      store.currentObjects = [...store.currentObjects, ...testResults]
      store.limit = testResults.total
      if (currentObject !== undefined) {
        store.iteratorIndex = store.currentObjects.findIndex((obj) => obj._id === currentObject) ?? 0
      }
      return store
    })
  }

  next (): T | undefined {
    let nextObject
    this.storeAdapter.update((store) => {
      if (store.iteratorIndex < store.currentObjects.length) {
        store.iteratorIndex += 1
        nextObject = store.currentObjects[store.iteratorIndex]
      }
      return store
    })
    return nextObject
  }

  hasNext (): boolean {
    const { currentObjects, iteratorIndex } = this.storeAdapter.get()
    return iteratorIndex < currentObjects.length - 1
  }
}

export class ObjectIteratorProvider<T extends Doc> {
  private objectIterator: ObjectIterator<T> | undefined = undefined

  constructor (private readonly storeAdapter: StoreAdapter<T>) {}

  async initialize (_class: Ref<Class<T>>, query: DocumentQuery<T>, currentObject: Ref<Doc> | undefined): Promise<void> {
    if (this.objectIterator === undefined) {
      this.objectIterator = new ObjectIterator(_class, query, this.storeAdapter)
      await this.objectIterator.loadObjects(currentObject)
    }
  }

  reset (): void {
    this.objectIterator = undefined
    this.storeAdapter.set(getDefaultIteratorState<T>({}))
  }

  getObject (): T | undefined {
    if (this.objectIterator === undefined) {
      console.error('ObjectIterator is not initialized')
      return undefined
    }
    return this.objectIterator?.next()
  }

  getIterator (): ObjectIterator<T> | undefined {
    return this.objectIterator
  }
}
