//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Phase 3c — Gantt undo/redo manager.
 *
 * One instance per `GanttView` mount. The manager keeps two LIFO stacks of
 * `UndoEntry` snapshots; each Gantt-induced mutation pushes an entry after
 * the DB-write commits successfully. `Cmd+Z` / `Ctrl+Z` pops the top entry
 * and applies its inverse via `client.apply(undefined, 'gantt-undo')` so the
 * activity log can later be filtered by that marker.
 *
 * The "stores" exposed below implement the minimal Svelte subscription
 * contract so callers (`GanttView.svelte`) can use `$canUndo` etc. without
 * pulling in `svelte/store` (ESM-only, incompatible with the project's
 * ts-jest setup — see plugins/tracker-resources/src/components/gantt/lib/
 * flash-store.ts for the same rationale).
 *
 * Spec: /opt/infrastructure/docs/superpowers/specs/2026-05-14-huly-gantt-undo-redo-design.md
 */

import type { Doc, Ref, Space, Timestamp } from '@hcengineering/core'
import type { DependencyKind, Issue, IssueRelation } from '@hcengineering/tracker'
import { wouldCreateCycle } from './scheduler'

// ---- Entry types -----------------------------------------------------------

export interface DateChangeEntry {
  kind: 'date-change'
  issueId: Ref<Issue>
  issueSpace: Ref<Space>
  before: { startDate: Timestamp | null, dueDate: Timestamp | null }
  after: { startDate: Timestamp | null, dueDate: Timestamp | null }
  description: string
}

export interface DateBatchChange {
  issueId: Ref<Issue>
  issueSpace: Ref<Space>
  before: { startDate: Timestamp | null, dueDate: Timestamp | null }
  after: { startDate: Timestamp | null, dueDate: Timestamp | null }
}

export interface DateBatchEntry {
  kind: 'date-batch'
  changes: DateBatchChange[]
  description: string
}

export interface RelationCreateEntry {
  kind: 'relation-create'
  relation: IssueRelation
  description: string
}

export interface RelationDeleteEntry {
  kind: 'relation-delete'
  relation: IssueRelation
  description: string
}

export interface RelationEditEntry {
  kind: 'relation-edit'
  relationId: Ref<IssueRelation>
  relationSpace: Ref<Space>
  before: { kind: DependencyKind, lag: number }
  after: { kind: DependencyKind, lag: number }
  description: string
}

/**
 * Reserved for Phase 3a v2 / Phase 1.E (inline attribute edits via Quick-Info
 * popover and inline grid columns). Apply path is wired below so a follow-up
 * can push entries of this kind without touching the manager itself.
 */
export interface AttributeChangeEntry {
  kind: 'attribute-change'
  issueId: Ref<Issue>
  issueSpace: Ref<Space>
  attr: 'status' | 'priority' | 'assignee' | 'estimation' | 'progress' | 'deadline'
  before: unknown
  after: unknown
  description: string
}

export type UndoEntry =
  | DateChangeEntry
  | DateBatchEntry
  | RelationCreateEntry
  | RelationDeleteEntry
  | RelationEditEntry
  | AttributeChangeEntry

export type UndoResult =
  | { kind: 'success', entry: UndoEntry, affectedIds: string[] }
  | { kind: 'empty' }
  | { kind: 'conflicted', entry: UndoEntry }
  | { kind: 'error', entry: UndoEntry, error: unknown }

// ---- Client adapter --------------------------------------------------------

/**
 * Narrow interface of the bits of `TxOperations & Client` the manager needs.
 * Lets jest tests stub this without instantiating Huly's full client stack.
 */
export interface UndoApplyOps {
  update: (doc: Doc, update: Record<string, unknown>) => Promise<unknown>
  addCollection: (
    _class: unknown,
    space: Ref<Space>,
    attachedTo: Ref<Issue>,
    attachedToClass: unknown,
    collection: string,
    attributes: Record<string, unknown>,
    id?: Ref<IssueRelation>
  ) => Promise<unknown>
  removeCollection: (
    _class: unknown,
    space: Ref<Space>,
    id: Ref<IssueRelation>,
    attachedTo: Ref<Issue>,
    attachedToClass: unknown,
    collection: string
  ) => Promise<unknown>
  commit: () => Promise<{ result: boolean | unknown }>
}

export interface UndoApplyClient {
  findOne: (clazz: unknown, query: { _id: unknown }) => Promise<unknown>
  findAll: (clazz: unknown, query: unknown) => Promise<unknown>
  apply: (marker?: string) => UndoApplyOps
}

// ---- Tiny store helper -----------------------------------------------------

/**
 * Minimal store contract — `subscribe(fn): unsubscribe`. Compatible with
 * Svelte's `$store` auto-subscription and trivially testable without the
 * ts-jest-incompatible `svelte/store` import.
 */
export interface ReadStore<T> {
  subscribe: (run: (value: T) => void) => () => void
  get: () => T
}

function makeStore<T> (initial: T): ReadStore<T> & { set: (v: T) => void } {
  let value = initial
  const subs = new Set<(value: T) => void>()
  return {
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
}

// ---- Constants -------------------------------------------------------------

const LIMIT = 50
export const UNDO_MARKER = 'gantt-undo'

// ---- The manager -----------------------------------------------------------

export class UndoManager {
  private readonly undoStack: UndoEntry[] = []
  private readonly redoStack: UndoEntry[] = []

  private readonly _canUndo = makeStore<boolean>(false)
  private readonly _canRedo = makeStore<boolean>(false)
  private readonly _nextUndoDescription = makeStore<string | null>(null)
  private readonly _nextRedoDescription = makeStore<string | null>(null)

  /** Reactive accessors. Implement Svelte's `subscribe` contract. */
  public readonly canUndo: ReadStore<boolean> = this._canUndo
  public readonly canRedo: ReadStore<boolean> = this._canRedo
  public readonly nextUndoDescription: ReadStore<string | null> = this._nextUndoDescription
  public readonly nextRedoDescription: ReadStore<string | null> = this._nextRedoDescription

  constructor (private readonly client: UndoApplyClient) {}

  push (entry: UndoEntry): void {
    this.undoStack.push(entry)
    while (this.undoStack.length > LIMIT) this.undoStack.shift()
    // Any new edit invalidates the redo path.
    this.redoStack.length = 0
    this.updateReactive()
  }

  async undo (): Promise<UndoResult> {
    const entry = this.undoStack.pop()
    if (entry === undefined) {
      this.updateReactive()
      return { kind: 'empty' }
    }
    try {
      const conflicted = await this.checkConflict(entry, 'undo')
      if (conflicted) {
        // Conflicted entries are dropped — they would overwrite remote work.
        return { kind: 'conflicted', entry }
      }
      const affected = await this.applyInverse(entry)
      this.redoStack.push(entry)
      return { kind: 'success', entry, affectedIds: affected }
    } catch (err) {
      // Entry is *not* re-pushed: the apply may have partially succeeded; a
      // retry from the same stack-position would double-apply. The user can
      // recreate the edit manually if needed.
      return { kind: 'error', entry, error: err }
    } finally {
      this.updateReactive()
    }
  }

  async redo (): Promise<UndoResult> {
    const entry = this.redoStack.pop()
    if (entry === undefined) {
      this.updateReactive()
      return { kind: 'empty' }
    }
    try {
      const conflicted = await this.checkConflict(entry, 'redo')
      if (conflicted) return { kind: 'conflicted', entry }
      const affected = await this.applyForward(entry)
      this.undoStack.push(entry)
      return { kind: 'success', entry, affectedIds: affected }
    } catch (err) {
      return { kind: 'error', entry, error: err }
    } finally {
      this.updateReactive()
    }
  }

  clear (): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.updateReactive()
  }

  /** Test-only: stack-depth probe. Keeps the production API minimal. */
  undoStackDepthForTest (): number {
    return this.undoStack.length
  }

  redoStackDepthForTest (): number {
    return this.redoStack.length
  }

  private updateReactive (): void {
    this._canUndo.set(this.undoStack.length > 0)
    this._canRedo.set(this.redoStack.length > 0)
    const topU = this.undoStack[this.undoStack.length - 1]
    const topR = this.redoStack[this.redoStack.length - 1]
    this._nextUndoDescription.set(topU?.description ?? null)
    this._nextRedoDescription.set(topR?.description ?? null)
  }

  // -- Apply paths ----------------------------------------------------------

  /** Returns the issue/relation IDs that were touched (for flash feedback). */
  private async applyInverse (entry: UndoEntry): Promise<string[]> {
    const ops = this.client.apply(UNDO_MARKER)
    const affected: string[] = []
    switch (entry.kind) {
      case 'date-change': {
        const issue = (await this.client.findOne(getIssueClass(), { _id: entry.issueId })) as Issue | undefined
        if (issue === undefined) throw new Error(`Undo: issue ${String(entry.issueId)} not found`)
        await ops.update(issue, { ...entry.before })
        affected.push(String(entry.issueId))
        break
      }
      case 'date-batch': {
        for (const c of entry.changes) {
          const i = (await this.client.findOne(getIssueClass(), { _id: c.issueId })) as Issue | undefined
          if (i === undefined) continue // skip missing, continue rest (Spec §6 partial-failure)
          await ops.update(i, { ...c.before })
          affected.push(String(c.issueId))
        }
        break
      }
      case 'relation-create': {
        // inverse of create = delete; use removeCollection so the
        // activity DUM keeps Issue-side attachment.
        await ops.removeCollection(
          entry.relation._class,
          entry.relation.space,
          entry.relation._id,
          entry.relation.attachedTo,
          entry.relation.attachedToClass,
          entry.relation.collection
        )
        affected.push(String(entry.relation._id))
        break
      }
      case 'relation-delete': {
        // inverse of delete = re-create with the SAME _id
        await ops.addCollection(
          entry.relation._class,
          entry.relation.space,
          entry.relation.attachedTo,
          String(entry.relation.attachedToClass),
          entry.relation.collection,
          {
            target: entry.relation.target,
            kind: entry.relation.kind,
            lag: entry.relation.lag
          },
          entry.relation._id
        )
        affected.push(String(entry.relation._id))
        break
      }
      case 'relation-edit': {
        const rel = (await this.client.findOne(getRelationClass(), { _id: entry.relationId })) as IssueRelation | undefined
        if (rel === undefined) throw new Error('Undo: relation not found')
        await ops.update(rel, { ...entry.before })
        affected.push(String(entry.relationId))
        break
      }
      case 'attribute-change': {
        const target = (await this.client.findOne(getIssueClass(), { _id: entry.issueId })) as Issue | undefined
        if (target === undefined) throw new Error('Undo: issue not found')
        await ops.update(target, { [entry.attr]: entry.before })
        affected.push(String(entry.issueId))
        break
      }
    }
    const r = await ops.commit()
    if (r.result === false) throw new Error('Undo: commit returned non-success result')
    return affected
  }

  private async applyForward (entry: UndoEntry): Promise<string[]> {
    const ops = this.client.apply(UNDO_MARKER)
    const affected: string[] = []
    switch (entry.kind) {
      case 'date-change': {
        const issue = (await this.client.findOne(getIssueClass(), { _id: entry.issueId })) as Issue | undefined
        if (issue === undefined) throw new Error(`Redo: issue ${String(entry.issueId)} not found`)
        await ops.update(issue, { ...entry.after })
        affected.push(String(entry.issueId))
        break
      }
      case 'date-batch': {
        for (const c of entry.changes) {
          const i = (await this.client.findOne(getIssueClass(), { _id: c.issueId })) as Issue | undefined
          if (i === undefined) continue
          await ops.update(i, { ...c.after })
          affected.push(String(c.issueId))
        }
        break
      }
      case 'relation-create': {
        // redo create = re-add with same _id
        await ops.addCollection(
          entry.relation._class,
          entry.relation.space,
          entry.relation.attachedTo,
          String(entry.relation.attachedToClass),
          entry.relation.collection,
          {
            target: entry.relation.target,
            kind: entry.relation.kind,
            lag: entry.relation.lag
          },
          entry.relation._id
        )
        affected.push(String(entry.relation._id))
        break
      }
      case 'relation-delete': {
        // redo delete = remove again, see  above.
        await ops.removeCollection(
          entry.relation._class,
          entry.relation.space,
          entry.relation._id,
          entry.relation.attachedTo,
          entry.relation.attachedToClass,
          entry.relation.collection
        )
        affected.push(String(entry.relation._id))
        break
      }
      case 'relation-edit': {
        const rel = (await this.client.findOne(getRelationClass(), { _id: entry.relationId })) as IssueRelation | undefined
        if (rel === undefined) throw new Error('Redo: relation not found')
        await ops.update(rel, { ...entry.after })
        affected.push(String(entry.relationId))
        break
      }
      case 'attribute-change': {
        const target = (await this.client.findOne(getIssueClass(), { _id: entry.issueId })) as Issue | undefined
        if (target === undefined) throw new Error('Redo: issue not found')
        await ops.update(target, { [entry.attr]: entry.after })
        affected.push(String(entry.issueId))
        break
      }
    }
    const r = await ops.commit()
    if (r.result === false) throw new Error('Redo: commit returned non-success result')
    return affected
  }

  // -- Conflict detection ---------------------------------------------------

  /**
   * Returns true iff applying this entry in the given direction would
   * overwrite work that another client (or another tab) has committed since
   * the entry was recorded. The check is per-entry-kind and intentionally
   * permissive: when in doubt, prefer false-positive (extra toast) over
   * false-negative (silent overwrite).
   */
  private async checkConflict (entry: UndoEntry, mode: 'undo' | 'redo'): Promise<boolean> {
    switch (entry.kind) {
      case 'date-change': {
        const expected = mode === 'undo' ? entry.after : entry.before
        const issue = (await this.client.findOne(getIssueClass(), { _id: entry.issueId })) as Issue | undefined
        if (issue === undefined) return true
        return !sameDatePair(issue, expected)
      }
      case 'date-batch': {
        for (const c of entry.changes) {
          const expected = mode === 'undo' ? c.after : c.before
          const i = (await this.client.findOne(getIssueClass(), { _id: c.issueId })) as Issue | undefined
          if (i === undefined) return true
          if (!sameDatePair(i, expected)) return true
        }
        return false
      }
      case 'relation-create': {
        // mode='undo' (we want to remove it): the relation must still exist.
        // mode='redo' (we want to re-create it): it must currently be absent.
        const existing = (await this.client.findOne(getRelationClass(), { _id: entry.relation._id })) as IssueRelation | undefined
        if (mode === 'undo') return existing === undefined
        return existing !== undefined
      }
      case 'relation-delete': {
        // mode='undo' (re-create): must be absent, and re-creating must not
        // form a cycle in the current graph.
        // mode='redo' (delete again): must still be present.
        const existing = (await this.client.findOne(getRelationClass(), { _id: entry.relation._id })) as IssueRelation | undefined
        if (mode === 'undo') {
          if (existing !== undefined) return true
          const allRels = (await this.client.findAll(getRelationClass(), { space: entry.relation.space })) as IssueRelation[]
          if (wouldCreateCycle(entry.relation.attachedTo, entry.relation.target, allRels)) return true
          return false
        }
        return existing === undefined
      }
      case 'relation-edit': {
        const expected = mode === 'undo' ? entry.after : entry.before
        const rel = (await this.client.findOne(getRelationClass(), { _id: entry.relationId })) as IssueRelation | undefined
        if (rel === undefined) return true
        return rel.kind !== expected.kind || rel.lag !== expected.lag
      }
      case 'attribute-change': {
        const expected = mode === 'undo' ? entry.after : entry.before
        const target = (await this.client.findOne(getIssueClass(), { _id: entry.issueId })) as Issue | undefined
        if (target === undefined) return true
        return (target as unknown as Record<string, unknown>)[entry.attr] !== expected
      }
    }
  }
}

// ---- Helpers ---------------------------------------------------------------

function sameDatePair (
  issue: Issue,
  expected: { startDate: Timestamp | null, dueDate: Timestamp | null }
): boolean {
  return (issue.startDate ?? null) === (expected.startDate ?? null) &&
    (issue.dueDate ?? null) === (expected.dueDate ?? null)
}

/**
 * The manager doesn't import `tracker` plugin metadata directly to keep the
 * file svelte-store-free and easy to unit-test. The class refs are passed as
 * opaque strings; the production client resolves them via the hierarchy. For
 * tests, the mock client switches on the string contents.
 */
function getIssueClass (): string {
  return 'tracker:class:Issue'
}
function getRelationClass (): string {
  return 'tracker:class:IssueRelation'
}

