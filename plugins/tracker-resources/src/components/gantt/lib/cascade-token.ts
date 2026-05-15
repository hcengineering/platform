//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 *  — cascadeToken plumbing.
 *
 * Every cascade-related commit in the Gantt (single-drag, parent-drag,
 * bypass and the soon-to-arrive bulk-drag from ) attaches
 * a fresh token to the `client.apply(undefined, scope)` call. The token
 * is the `scope` string, so downstream consumers can correlate every
 * sub-Tx of the same cascade by scope-string equality:
 *
 *   •  (Bulk-Drag) — all bulk-moved primaries plus their
 *     cascade fanout share one token, so the dependency-graph layer
 *     can build a single visual undo entry per bulk operation instead
 *     of N entries (which would over-count in the undo stack).
 *
 *   • Tier-4 Item 14 (Dependency-Shift-Notification) — the cascade-commit
 *     in GanttView.svelte forwards the freshly-minted token to
 *     `sendDependencyShiftedNotifications`, which uses it as the
 *     `cascadeToken` field on every `DependencyShiftedNotification` so
 *     downstream consumers can correlate the bundle with the Tx batch.
 *     The token is *also* the `TxApplyIf.scope` of the commit; a future
 *     server-side trigger could read it to suppress the auto-generated
 *     `dueDate` notifications, but that pathway is consumed inside
 *     `ApplyTxMiddleware` today (see `dependency-shift-send.ts` notes for
 *     details) — so v1 emits the bundle as a sibling notification rather
 *     than replacing the generic ping.
 *
 * The token is intentionally a *string* and not a Tx-Mixin, because:
 *   1. No schema change → no migration cost.
 *   2. `TxApplyIf.scope` already round-trips through the server (it
 *      drives the optimistic-concurrency match-set), so it is visible
 *      to triggers without extra plumbing.
 *   3. Plays nicely with `client.apply()` overloads that already accept
 *      a scope string everywhere in this codebase.
 *
 * The suffix is `Date.now()` plus a monotonic counter — collision-free
 * within one client process, unique enough across processes for the
 * notification batching window (~minutes). If we ever need cross-server
 * uniqueness, swap the suffix for a v4 UUID without touching the call
 * sites; the prefix contract stays.
 */

let counter = 0

/**
 * Returns a fresh cascade-token usable as the `scope` argument of
 * `client.apply(undefined, scope)`. The default prefix is `gantt-cascade`;
 * specialized call sites pass their own scope (`gantt-cascade-commit`,
 * `gantt-cascade-bypass`, `gantt-no-cascade`, `gantt-bulk-drag`, …) so
 * that the leading segment of the scope still classifies the call site
 * for human-readable tx-logs, while the trailing `:<id>` segment
 * identifies the cascade instance.
 */
export function newCascadeToken (prefix: string = 'gantt-cascade'): string {
  counter = (counter + 1) | 0
  return `${prefix}:${Date.now()}-${counter}`
}
