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
import { ObjectIterator, type StoreAdapter, type IteratorState, ObjectIteratorProvider } from '../objectIterator'
import { type DocumentQuery, type Doc, type Ref, type Class } from '@hcengineering/core'

let mockObjects: Doc[] = []
const findAll = jest.fn(() => mockObjects)
jest.mock('@hcengineering/presentation', () => ({
  getClient: jest.fn(() => ({
    findAll
  }))
}))

describe('ObjectIterator', () => {
  let storeAdapter: StoreAdapter<Doc>

  beforeEach(() => {
    jest.clearAllMocks()

    let state: IteratorState<Doc> = {
      query: {},
      currentObjects: [],
      iteratorIndex: 0,
      limit: 0
    }
    storeAdapter = {
      set: jest.fn((newState) => {
        state = newState
      }),
      update: jest.fn((updater) => {
        state = updater(state)
      }),
      get: jest.fn(() => state)
    }
  })

  it('should initialize the store with the given query', async () => {
    const query: DocumentQuery<Doc> = { key: 'value' }
    const _class: Ref<Class<Doc>> = { id: 'class1' } as any

    // eslint-disable-next-line no-new
    new ObjectIterator(_class, query, storeAdapter)
    expect(storeAdapter.set).toHaveBeenCalledWith({
      query,
      currentObjects: [],
      iteratorIndex: 0,
      limit: 100
    })
  })

  it('should load objects and update the store', async () => {
    mockObjects = [{ id: '1' }, { id: '2' }] as any

    const query: DocumentQuery<Doc> = { key: 'value' }
    const _class: Ref<Class<Doc>> = { id: 'class1' } as any

    const iterator = new ObjectIterator(_class, query, storeAdapter)
    await iterator.loadObjects()

    expect(findAll).toHaveBeenCalledWith(_class, query, {
      limit: 100,
      total: true
    })
    expect(storeAdapter.update).toHaveBeenCalledWith(expect.any(Function))
    const state = storeAdapter.get()
    expect(state?.currentObjects.length).toBe(2)
    expect(state?.iteratorIndex).toBe(0)
  })

  it('should return the next object and update the iterator', async () => {
    mockObjects = [{ id: '1' }, { id: '2' }, { id: '3' }] as any
    const query: DocumentQuery<Doc> = { key: 'value' }
    const _class: Ref<Class<Doc>> = { id: 'class1' } as any
    const iterator = new ObjectIterator(_class, query, storeAdapter)
    await iterator.loadObjects()
    let nextObject = iterator.getNextObject()

    expect(nextObject).toEqual(mockObjects[0])
    expect(storeAdapter.update).toHaveBeenCalledWith(expect.any(Function))

    nextObject = iterator.getNextObject()
    expect(nextObject).toEqual(mockObjects[1])

    nextObject = iterator.getNextObject()
    expect(nextObject).toEqual(mockObjects[2])

    nextObject = iterator.getNextObject()
    expect(nextObject).toBeUndefined()
  })

  it('should return undefined for empty array', async () => {
    mockObjects = [] as any
    const query: DocumentQuery<Doc> = { key: 'value' }
    const _class: Ref<Class<Doc>> = { id: 'class1' } as any
    const iterator = new ObjectIterator(_class, query, storeAdapter)
    await iterator.loadObjects()
    const nextObject = iterator.getNextObject()

    expect(nextObject).toBeUndefined()
  })

  it('should not create a new ObjectIterator if already defined', async () => {
    const query: DocumentQuery<Doc> = { key: 'value' }
    const _class: Ref<Class<Doc>> = { id: 'class1' } as any
    const provider = new ObjectIteratorProvider(storeAdapter)

    await provider.initialize(_class, query)
    const firstIterator = provider.getIterator()

    await provider.initialize(_class, query)
    const secondIterator = provider.getIterator()

    expect(firstIterator).toBe(secondIterator)
    expect(firstIterator).toBeDefined()
  })

  it('should reset the state of ObjectIterator', async () => {
    const query: DocumentQuery<Doc> = { key: 'value' }
    const _class: Ref<Class<Doc>> = { id: 'class1' } as any
    const provider = new ObjectIteratorProvider(storeAdapter)

    await provider.initialize(_class, query)
    provider.reset()

    expect(storeAdapter.set).toHaveBeenCalledWith({
      query: {},
      currentObjects: [],
      iteratorIndex: 0,
      limit: 100
    })
  })
})
