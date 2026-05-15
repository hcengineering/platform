//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import { createTreeExpandStore } from '../tree-expand-store'

function makeStorage (): Storage {
  const map = new Map<string, string>()
  return {
    get length (): number { return map.size },
    clear: () => { map.clear() },
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => { map.delete(k) },
    setItem: (k: string, v: string) => { map.set(k, v) }
  }
}

describe('createTreeExpandStore', () => {
  it('returns an empty set when nothing is persisted', () => {
    const s = createTreeExpandStore('proj-A', makeStorage())
    expect(s.getCollapsed().size).toBe(0)
  })

  it('persists toggle across re-creation for the same project', () => {
    const storage = makeStorage()
    const s1 = createTreeExpandStore('proj-A', storage)
    s1.toggle('issue:foo')
    expect(s1.getCollapsed().has('issue:foo')).toBe(true)
    const s2 = createTreeExpandStore('proj-A', storage)
    expect(s2.getCollapsed().has('issue:foo')).toBe(true)
  })

  it('toggles an existing entry off', () => {
    const s = createTreeExpandStore('proj-A', makeStorage())
    s.toggle('issue:foo')
    s.toggle('issue:foo')
    expect(s.getCollapsed().size).toBe(0)
  })

  it('isolates state per project key', () => {
    const storage = makeStorage()
    const a = createTreeExpandStore('proj-A', storage)
    const b = createTreeExpandStore('proj-B', storage)
    a.toggle('issue:x')
    expect(b.getCollapsed().has('issue:x')).toBe(false)
  })

  it('setAll replaces the entire state', () => {
    const s = createTreeExpandStore('proj-A', makeStorage())
    s.toggle('issue:1')
    s.setAll(new Set(['issue:2', 'issue:3']))
    expect(s.getCollapsed().has('issue:1')).toBe(false)
    expect(s.getCollapsed().has('issue:2')).toBe(true)
    expect(s.getCollapsed().has('issue:3')).toBe(true)
  })

  it('expandAll clears all collapsed ids', () => {
    const s = createTreeExpandStore('proj-A', makeStorage())
    s.setAll(new Set(['issue:1', 'issue:2']))
    s.expandAll()
    expect(s.getCollapsed().size).toBe(0)
  })

  it('collapseAll fills state with the given ids', () => {
    const s = createTreeExpandStore('proj-A', makeStorage())
    s.collapseAll(['issue:1', 'issue:2'])
    expect(s.getCollapsed().size).toBe(2)
  })

  it('survives a corrupt persisted value', () => {
    const storage = makeStorage()
    storage.setItem('huly:gantt:tree-collapsed:proj-A', 'not-json')
    const s = createTreeExpandStore('proj-A', storage)
    expect(s.getCollapsed().size).toBe(0)
  })

  it('rejects non-array persisted JSON', () => {
    const storage = makeStorage()
    storage.setItem('huly:gantt:tree-collapsed:proj-A', '{"foo":true}')
    const s = createTreeExpandStore('proj-A', storage)
    expect(s.getCollapsed().size).toBe(0)
  })

  it('subscribe fires with current snapshot then on each change', () => {
    const s = createTreeExpandStore('proj-A', makeStorage())
    const sizes: number[] = []
    s.subscribe(set => { sizes.push(set.size) })
    s.toggle('issue:1')
    s.toggle('issue:2')
    s.expandAll()
    expect(sizes).toEqual([0, 1, 2, 0])
  })

  it('unsubscribe stops notifications', () => {
    const s = createTreeExpandStore('proj-A', makeStorage())
    const sizes: number[] = []
    const unsub = s.subscribe(set => { sizes.push(set.size) })
    unsub()
    s.toggle('issue:1')
    expect(sizes).toEqual([0])
  })
})
