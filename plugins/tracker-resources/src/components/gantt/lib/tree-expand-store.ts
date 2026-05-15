//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Tier-4 Item 12 — Tree-View — persisted expand/collapse state for the Gantt
 * sidebar hierarchy.
 *
 * Spec decisions implemented here:
 *   - Persisted **per user** (one localStorage namespace per user-session) AND
 *     keyed **per project** so cross-project navigation does not bleed state.
 *   - Default is **expanded** — the persisted value records *only* deviations
 *     (i.e. the row-ids the user has explicitly collapsed), so an unseen issue
 *     is implicitly expanded.
 *
 * Storage backend is the `Storage` interface (browser `localStorage` in
 * production, an in-memory shim in unit tests). The spec mentions a future
 * migration to `@hcengineering/preference`-backed docs; the store-API here is
 * deliberately backend-agnostic so the swap is a one-file change.
 *
 * Failure modes:
 *   - corrupt JSON / non-array values → treated as "no persisted state"
 *     (the user simply gets the default-expanded view, no exception thrown).
 *   - `setItem` throwing (quota exceeded, private mode) → caught and ignored;
 *     state still updates in-memory and listeners still fire.
 */

const KEY_PREFIX = 'huly:gantt:tree-collapsed:'

export interface TreeExpandStore {
  /** Current set of row-ids that are collapsed. */
  getCollapsed: () => Set<string>
  /** Flip a single id's collapsed-state. */
  toggle: (id: string) => void
  /** Replace the entire collapsed-set. */
  setAll: (collapsed: Set<string>) => void
  /** Clear all entries (everything expanded). */
  expandAll: () => void
  /** Collapse the supplied ids (everything else expanded). */
  collapseAll: (ids: readonly string[]) => void
  /**
   * Subscribe to state changes. The callback is invoked once synchronously
   * with the current snapshot, then again after every mutation. Returns an
   * unsubscribe function.
   */
  subscribe: (cb: (collapsed: Set<string>) => void) => () => void
}

function readPersisted (storage: Storage, key: string): Set<string> {
  try {
    const raw = storage.getItem(key)
    if (raw === null || raw === '') return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const out = new Set<string>()
    for (const v of parsed) {
      if (typeof v === 'string') out.add(v)
    }
    return out
  } catch {
    return new Set()
  }
}

function writePersisted (storage: Storage, key: string, value: Set<string>): void {
  try {
    storage.setItem(key, JSON.stringify([...value]))
  } catch {
    // quota exceeded / private-mode — silently drop the write; the in-memory
    // state still reflects the user's intent for the current session.
  }
}

/**
 * Build a fresh store bound to one project. Each call reads the persisted
 * value at construction time; later changes from a parallel store on the same
 * key would not be observed without a manual reload (acceptable since the
 * user typically has a single Gantt tab open per project).
 */
export function createTreeExpandStore (projectId: string, storage: Storage): TreeExpandStore {
  const key = KEY_PREFIX + projectId
  let current: Set<string> = readPersisted(storage, key)
  const listeners = new Set<(c: Set<string>) => void>()

  function commit (next: Set<string>): void {
    current = next
    writePersisted(storage, key, current)
    for (const cb of listeners) cb(current)
  }

  return {
    getCollapsed: () => current,
    toggle: (id) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      commit(next)
    },
    setAll: (collapsed) => { commit(new Set(collapsed)) },
    expandAll: () => { commit(new Set()) },
    collapseAll: (ids) => { commit(new Set(ids)) },
    subscribe: (cb) => {
      listeners.add(cb)
      cb(current)
      return () => { listeners.delete(cb) }
    }
  }
}
