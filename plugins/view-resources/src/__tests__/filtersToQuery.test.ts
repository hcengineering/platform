//
// Copyright © 2026 TraceX SAS.
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

// Keep the svelte-heavy `@hcengineering/ui` and the live-query presentation layer out of the
// unit under test; only `getClient` and `getResource` are exercised by `filtersToQuery`.
import { getResource } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'

import { filtersToQuery } from '../filter'

jest.mock('@hcengineering/presentation', () => ({
  getClient: jest.fn(),
  createQuery: jest.fn()
}))
jest.mock('@hcengineering/ui', () => ({
  getCurrentResolvedLocation: jest.fn(),
  locationToUrl: jest.fn()
}))
jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return { ...actual, getResource: jest.fn() }
})
// `filter.ts` also imports `svelte/store` and calls `writable(...)` at module scope (for
// `filterStore`/`selectedFilterStore`). The real package ships ESM syntax that ts-jest does not
// transform under `node_modules`, so it must be mocked with a minimal store implementation rather
// than left to load for real.
jest.mock('svelte/store', () => {
  interface Store<T> {
    set: (v: T) => void
    update: (fn: (v: T) => T) => void
    subscribe: (fn: (v: T) => void) => () => void
  }

  const writable = <T>(initial: T): Store<T> => {
    let value = initial
    const subscribers = new Set<(v: T) => void>()
    return {
      set: (v: T) => {
        value = v
        subscribers.forEach((fn) => {
          fn(value)
        })
      },
      update: (fn: (v: T) => T) => {
        value = fn(value)
        subscribers.forEach((fn) => {
          fn(value)
        })
      },
      subscribe: (fn: (v: T) => void) => {
        fn(value)
        subscribers.add(fn)
        return () => subscribers.delete(fn)
      }
    }
  }

  const get = <T>(store: Store<T>): T => {
    // Assigned synchronously by `subscribe` below — the mock invokes the callback immediately.
    let value: T = undefined as unknown as T
    const unsubscribe = store.subscribe((v) => {
      value = v
    })
    unsubscribe()
    return value
  }

  return { writable, get }
})

function makeHierarchy (isMixin = false): any {
  return {
    clone: (v: any) => JSON.parse(JSON.stringify(v)),
    getAttribute: () => ({ attributeOf: 'test:class:Owner' }),
    isMixin: () => isMixin
  }
}

function makeFilter (key: string, value: any[] = []): any {
  return {
    key: { key, _class: 'test:class:Owner', label: 'test:string:Label' },
    mode: 'test:filterMode:Is',
    modes: ['test:filterMode:Is'],
    value,
    index: 1
  }
}

function mockClient (hierarchy: any): void {
  ;(getClient as jest.Mock).mockReturnValue({
    getHierarchy: () => hierarchy,
    findOne: jest.fn(async () => ({ _id: 'test:filterMode:Is', result: 'test:resource:Is' }))
  })
}

describe('filtersToQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the base query unchanged when there are no filters', async () => {
    mockClient(makeHierarchy())
    const q = await filtersToQuery([], { isLatest: true })
    expect(q).toEqual({ isLatest: true })
  })

  it('resolves a filter via its mode and writes the value under the attribute key', async () => {
    mockClient(makeHierarchy())
    ;(getResource as jest.Mock).mockResolvedValue(async () => ({ $in: ['final'] }))

    const q = await filtersToQuery([makeFilter('status', ['final'])])
    expect(q).toEqual({ status: { $in: ['final'] } })
  })

  it('preserves the base query and adds the filter alongside it', async () => {
    mockClient(makeHierarchy())
    ;(getResource as jest.Mock).mockResolvedValue(async () => ({ $in: ['final'] }))

    const q = await filtersToQuery([makeFilter('status', ['final'])], { isLatest: true })
    expect(q).toEqual({ isLatest: true, status: { $in: ['final'] } })
  })

  it('prefixes the key with the mixin id for mixin attributes', async () => {
    mockClient(makeHierarchy(true))
    ;(getResource as jest.Mock).mockResolvedValue(async () => ({ $in: ['x'] }))

    const q = await filtersToQuery([makeFilter('grade', ['x'])])
    expect(q).toEqual({ 'test:class:Owner.grade': { $in: ['x'] } })
  })

  it('skips a filter whose mode cannot be resolved', async () => {
    const hierarchy = makeHierarchy()
    ;(getClient as jest.Mock).mockReturnValue({
      getHierarchy: () => hierarchy,
      findOne: jest.fn(async () => undefined)
    })

    const q = await filtersToQuery([makeFilter('status', ['final'])], { isLatest: true })
    expect(q).toEqual({ isLatest: true })
    expect(getResource as jest.Mock).not.toHaveBeenCalled()
  })

  it('intersects two $in conditions on the same key instead of clobbering', async () => {
    mockClient(makeHierarchy())
    ;(getResource as jest.Mock)
      .mockResolvedValueOnce(async () => ({ $in: ['a', 'b', 'c'] }))
      .mockResolvedValueOnce(async () => ({ $in: ['b', 'c', 'd'] }))

    const q = await filtersToQuery([makeFilter('status'), makeFilter('status')])
    expect(q).toEqual({ status: { $in: ['b', 'c'] } })
  })

  it('concatenates $nin conditions on the same key', async () => {
    mockClient(makeHierarchy())
    ;(getResource as jest.Mock)
      .mockResolvedValueOnce(async () => ({ $nin: ['a'] }))
      .mockResolvedValueOnce(async () => ({ $nin: ['b'] }))

    const q = await filtersToQuery([makeFilter('status'), makeFilter('status')])
    expect(q).toEqual({ status: { $nin: ['a', 'b'] } })
  })

  it('skips only the stale filter when its attribute no longer exists', async () => {
    const hierarchy = makeHierarchy()
    hierarchy.getAttribute = jest.fn((_class: string, key: string) => {
      if (key === 'gone') throw new Error('no such attribute')
      return { attributeOf: 'test:class:Owner' }
    })
    mockClient(hierarchy)
    ;(getResource as jest.Mock).mockResolvedValue(async () => ({ $in: ['final'] }))

    const q = await filtersToQuery([makeFilter('gone'), makeFilter('status')], { isLatest: true })
    expect(q).toEqual({ isLatest: true, status: { $in: ['final'] } })
  })

  it('rejects a missing filter mode for tracked table refreshes', async () => {
    ;(getClient as jest.Mock).mockReturnValue({
      getHierarchy: () => makeHierarchy(),
      findOne: jest.fn(async () => undefined)
    })
    await expect(filtersToQuery([makeFilter('status')], {}, true)).rejects.toThrow('Missing filter mode')
  })
})
