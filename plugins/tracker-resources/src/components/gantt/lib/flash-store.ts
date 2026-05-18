//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3c — visual feedback store for undo/redo.
 *
 * GanttBar / GanttDependencyArrow subscribe to this store; entries listed in
 * the Set get a transient highlight (gepunktete outline). The UndoManager
 * pushes IDs into the store on successful undo/redo, and the timer below
 * removes them after `durationMs`.
 *
 * Per-id timers are tracked so that overlapping flashes don't truncate each
 * other: a second `flashIssues(['x'], …)` while `x` is already flashing
 * cancels the pending timeout and schedules a fresh one starting from the
 * second call.
 *
 * The store implements the minimal Svelte contract (`subscribe`) so that
 * GanttView / GanttBar can use `$flashStore` syntax — without dragging in
 * `svelte/store`, which is ESM-only and breaks jest-ts-jest in this repo.
 */
export interface FlashStore {
  subscribe: (run: (value: Set<string>) => void) => () => void
  get: () => Set<string>
  // internal — exposed for the flashIssues helper
  set: (value: Set<string>) => void
}

const timers = new WeakMap<FlashStore, Map<string, ReturnType<typeof setTimeout>>>()

export function createFlashStore (): FlashStore {
  let value = new Set<string>()
  const subs = new Set<(value: Set<string>) => void>()
  const store: FlashStore = {
    subscribe (run) {
      subs.add(run)
      run(value)
      return () => {
        subs.delete(run)
      }
    },
    get () {
      return value
    },
    set (next) {
      value = next
      for (const fn of subs) fn(value)
    }
  }
  timers.set(store, new Map())
  return store
}

export function flashIssues (ids: string[], durationMs: number, store: FlashStore): void {
  const perStoreTimers = timers.get(store) ?? new Map<string, ReturnType<typeof setTimeout>>()
  timers.set(store, perStoreTimers)

  const cur = store.get()
  const next = new Set(cur)
  for (const id of ids) next.add(id)
  store.set(next)

  for (const id of ids) {
    const existing = perStoreTimers.get(id)
    if (existing !== undefined) clearTimeout(existing)
    const handle = setTimeout(() => {
      perStoreTimers.delete(id)
      const c = store.get()
      if (!c.has(id)) return
      const n = new Set(c)
      n.delete(id)
      store.set(n)
    }, durationMs)
    perStoreTimers.set(id, handle)
  }
}
