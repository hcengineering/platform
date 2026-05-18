//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

import type { Ref, Space } from '@hcengineering/core'
import type { Issue, IssueRelation } from '@hcengineering/tracker'
import { UndoManager, type UndoEntry, type UndoApplyClient } from '../undo-manager'

const space = 'space-1' as Ref<Space>

function makeIssue (id: string, startDate: number | null, dueDate: number | null): Issue {
  return {
    _id: id as Ref<Issue>,
    _class: 'tracker:class:Issue' as Issue['_class'],
    space,
    startDate,
    dueDate
  } as unknown as Issue
}

function makeRelation (id: string, from: string, to: string, kind: IssueRelation['kind'] = 'finish-to-start', lag = 0): IssueRelation {
  return {
    _id: id as Ref<IssueRelation>,
    _class: 'tracker:class:IssueRelation' as IssueRelation['_class'],
    space,
    attachedTo: from as Ref<Issue>,
    attachedToClass: 'tracker:class:Issue' as Issue['_class'],
    collection: 'relations',
    target: to as Ref<Issue>,
    kind,
    lag
  } as unknown as IssueRelation
}

function dateChange (id: string, beforeStart: number, beforeDue: number, afterStart: number, afterDue: number): UndoEntry {
  return {
    kind: 'date-change',
    issueId: id as Ref<Issue>,
    issueSpace: space,
    before: { startDate: beforeStart, dueDate: beforeDue },
    after: { startDate: afterStart, dueDate: afterDue },
    description: `Move ${id}`
  }
}

interface MockOps {
  updates: Array<{ doc: { _id: string }, update: Record<string, unknown> }>
  added: Array<{ _class: string, space: string, attachedTo: string, attachedToClass: string, collection: string, attributes: Record<string, unknown>, id?: string }>
  removed: Array<{ _class: string, space: string, id: string }>
  removeDocCount: number
}

interface MockClient extends UndoApplyClient {
  state: {
    issues: Map<string, Issue>
    relations: Map<string, IssueRelation>
    mockOps: MockOps
    failNextCommit?: boolean
  }
}

function makeClient (initial: { issues?: Issue[], relations?: IssueRelation[] } = {}): MockClient {
  const issues = new Map<string, Issue>()
  const relations = new Map<string, IssueRelation>()
  for (const i of initial.issues ?? []) issues.set(String(i._id), i)
  for (const r of initial.relations ?? []) relations.set(String(r._id), r)
  const mockOps: MockOps = { updates: [], added: [], removed: [], removeDocCount: 0 }

  const client: MockClient = {
    state: { issues, relations, mockOps },
    async findOne (clazz: unknown, query: { _id: unknown }) {
      const id = String(query._id)
      // pick from the right map by stringified class
      const c = String(clazz)
      if (c.includes('IssueRelation')) return relations.get(id) as unknown as never
      return issues.get(id) as unknown as never
    },
    async findAll (_clazz: unknown, _query: unknown) {
      return Array.from(relations.values()) as unknown as never
    },
    apply (_marker: string | undefined) {
      const pending: Array<() => void> = []
      return {
        async update (doc: { _id: string, _class?: string }, update: Record<string, unknown>) {
          mockOps.updates.push({ doc: { _id: String(doc._id) }, update })
          pending.push(() => {
            const cur = issues.get(String(doc._id))
            if (cur !== undefined) {
              issues.set(String(doc._id), { ...cur, ...update } as Issue)
              return
            }
            const rel = relations.get(String(doc._id))
            if (rel !== undefined) {
              relations.set(String(doc._id), { ...rel, ...update } as IssueRelation)
            }
          })
          return undefined
        },
        async addCollection (
          clazz: string,
          spc: string,
          attachedTo: string,
          attachedToClass: string,
          collection: string,
          attributes: Record<string, unknown>,
          id?: string
        ) {
          mockOps.added.push({ _class: clazz, space: spc, attachedTo, attachedToClass, collection, attributes, id })
          const newId = id ?? `gen-${mockOps.added.length}`
          pending.push(() => {
            relations.set(newId, {
              _id: newId as Ref<IssueRelation>,
              _class: clazz as IssueRelation['_class'],
              space: spc as Ref<Space>,
              attachedTo: attachedTo as Ref<Issue>,
              attachedToClass: attachedToClass as Issue['_class'],
              collection,
              ...attributes
            } as unknown as IssueRelation)
          })
          return newId
        },
        async removeCollection (
          clazz: string,
          spc: string,
          id: string,
          _attachedTo: string,
          _attachedToClass: string,
          _collection: string
        ) {
          mockOps.removed.push({ _class: clazz, space: spc, id })
          pending.push(() => {
            relations.delete(id)
          })
          return undefined
        },
        async commit () {
          if (client.state.failNextCommit === true) {
            client.state.failNextCommit = false
            throw new Error('mock-commit-fail')
          }
          for (const fn of pending) fn()
          return { result: true }
        }
      } as unknown as ReturnType<UndoApplyClient['apply']>
    }
  }
  return client
}

describe('UndoManager — basic stack semantics', () => {
  it('starts empty', () => {
    const client = makeClient()
    const mgr = new UndoManager(client)
    expect(mgr.canUndo.get()).toBe(false)
    expect(mgr.canRedo.get()).toBe(false)
    expect(mgr.nextUndoDescription.get()).toBeNull()
    expect(mgr.nextRedoDescription.get()).toBeNull()
  })

  it('push updates reactive stores', () => {
    const client = makeClient()
    const mgr = new UndoManager(client)
    mgr.push(dateChange('a', 1, 2, 3, 4))
    expect(mgr.canUndo.get()).toBe(true)
    expect(mgr.canRedo.get()).toBe(false)
    expect(mgr.nextUndoDescription.get()).toBe('Move a')
  })

  it('limits stack to 50 entries (oldest dropped)', () => {
    const client = makeClient()
    const mgr = new UndoManager(client)
    for (let i = 0; i < 60; i++) mgr.push(dateChange(`i${i}`, 0, 0, 0, 0))
    // size capped at 50; the top of stack is the last push
    expect(mgr.nextUndoDescription.get()).toBe('Move i59')
    // 10 oldest dropped → 50 remaining, all 'Move i10'..'Move i59'
    // Walk the stack via undoStackDepth() (test-only helper)
    expect(mgr.undoStackDepthForTest()).toBe(50)
  })

  it('push clears the redo stack', async () => {
    const issue = makeIssue('a', 100, 200)
    const client = makeClient({ issues: [issue] })
    const mgr = new UndoManager(client)
    // First push and undo so something is in the redo stack
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('success')
    expect(mgr.canRedo.get()).toBe(true)
    // Now a brand-new edit should clear redo
    mgr.push(dateChange('b', 0, 0, 0, 0))
    expect(mgr.canRedo.get()).toBe(false)
  })

  it('undo on empty stack returns { kind: "empty" }', async () => {
    const client = makeClient()
    const mgr = new UndoManager(client)
    const r = await mgr.undo()
    expect(r.kind).toBe('empty')
  })

  it('redo on empty stack returns { kind: "empty" }', async () => {
    const client = makeClient()
    const mgr = new UndoManager(client)
    const r = await mgr.redo()
    expect(r.kind).toBe('empty')
  })

  it('clear() wipes both stacks', async () => {
    const client = makeClient({ issues: [makeIssue('a', 100, 200)] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    await mgr.undo()
    expect(mgr.canRedo.get()).toBe(true)
    mgr.clear()
    expect(mgr.canUndo.get()).toBe(false)
    expect(mgr.canRedo.get()).toBe(false)
  })
})

describe('UndoManager — date-change apply', () => {
  it('undo applies "before" snapshot via client.apply().update()', async () => {
    const issue = makeIssue('a', 100, 200) // current = after
    const client = makeClient({ issues: [issue] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('success')
    expect(client.state.mockOps.updates).toHaveLength(1)
    expect(client.state.mockOps.updates[0].update).toEqual({ startDate: 50, dueDate: 150 })
    // state now matches "before"; redo stack has the entry
    expect(client.state.issues.get('a')?.startDate).toBe(50)
    expect(mgr.canRedo.get()).toBe(true)
  })

  it('redo applies "after" snapshot', async () => {
    const issue = makeIssue('a', 100, 200)
    const client = makeClient({ issues: [issue] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    await mgr.undo()
    const r = await mgr.redo()
    expect(r.kind).toBe('success')
    expect(client.state.issues.get('a')?.startDate).toBe(100)
    expect(client.state.issues.get('a')?.dueDate).toBe(200)
    expect(mgr.canRedo.get()).toBe(false)
    expect(mgr.canUndo.get()).toBe(true)
  })

  it('undo date-batch applies all "before" snapshots in one apply()', async () => {
    const a = makeIssue('a', 100, 200)
    const b = makeIssue('b', 300, 400)
    const client = makeClient({ issues: [a, b] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-batch',
      changes: [
        { issueId: 'a' as Ref<Issue>, issueSpace: space, before: { startDate: 50, dueDate: 150 }, after: { startDate: 100, dueDate: 200 } },
        { issueId: 'b' as Ref<Issue>, issueSpace: space, before: { startDate: 250, dueDate: 350 }, after: { startDate: 300, dueDate: 400 } }
      ],
      description: 'Cascade: 2 issues shifted'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('success')
    expect(client.state.mockOps.updates).toHaveLength(2)
    expect(client.state.issues.get('a')?.startDate).toBe(50)
    expect(client.state.issues.get('b')?.startDate).toBe(250)
  })

  it('redo date-batch applies all "after"', async () => {
    const a = makeIssue('a', 100, 200)
    const b = makeIssue('b', 300, 400)
    const client = makeClient({ issues: [a, b] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-batch',
      changes: [
        { issueId: 'a' as Ref<Issue>, issueSpace: space, before: { startDate: 50, dueDate: 150 }, after: { startDate: 100, dueDate: 200 } },
        { issueId: 'b' as Ref<Issue>, issueSpace: space, before: { startDate: 250, dueDate: 350 }, after: { startDate: 300, dueDate: 400 } }
      ],
      description: 'Cascade: 2 issues shifted'
    })
    await mgr.undo()
    const r = await mgr.redo()
    expect(r.kind).toBe('success')
    expect(client.state.issues.get('a')?.startDate).toBe(100)
    expect(client.state.issues.get('b')?.startDate).toBe(300)
  })

  it('undo returns { kind: "error" } when commit throws', async () => {
    const issue = makeIssue('a', 100, 200)
    const client = makeClient({ issues: [issue] })
    client.state.failNextCommit = true
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('error')
    // Entry stays popped from undo stack but is NOT pushed to redo on error.
    expect(mgr.canUndo.get()).toBe(false)
    expect(mgr.canRedo.get()).toBe(false)
  })
})

describe('UndoManager — conflict detection', () => {
  it('undo flags conflict when current state differs from entry.after', async () => {
    // current dates are 999/999, entry.after is 100/200 → mismatch
    const issue = makeIssue('a', 999, 999)
    const client = makeClient({ issues: [issue] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('conflicted')
    // No update issued
    expect(client.state.mockOps.updates).toHaveLength(0)
    // Entry consumed — undo-stack now empty, but NOT added to redo
    expect(mgr.canUndo.get()).toBe(false)
    expect(mgr.canRedo.get()).toBe(false)
  })

  it('undo flags conflict when issue is gone', async () => {
    const client = makeClient({ issues: [] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('conflicted')
  })

  it('undo date-batch flags conflict when ANY change diverges', async () => {
    const a = makeIssue('a', 100, 200) // matches after
    const b = makeIssue('b', 9999, 9999) // mismatches after
    const client = makeClient({ issues: [a, b] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-batch',
      changes: [
        { issueId: 'a' as Ref<Issue>, issueSpace: space, before: { startDate: 50, dueDate: 150 }, after: { startDate: 100, dueDate: 200 } },
        { issueId: 'b' as Ref<Issue>, issueSpace: space, before: { startDate: 250, dueDate: 350 }, after: { startDate: 300, dueDate: 400 } }
      ],
      description: 'Cascade'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('conflicted')
    expect(client.state.mockOps.updates).toHaveLength(0)
  })

  it('redo flags conflict when current diverges from entry.before', async () => {
    const issue = makeIssue('a', 50, 150)
    const client = makeClient({ issues: [issue] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-change',
      issueId: 'a' as Ref<Issue>,
      issueSpace: space,
      before: { startDate: 50, dueDate: 150 },
      after: { startDate: 100, dueDate: 200 },
      description: 'Move a'
    })
    // First undo legitimately (current=after at push time was 50/150 already — we use the inverse path here for simplicity).
    // Actually we push then mutate the issue externally before redo so the redo conflicts.
    // Better: manually populate the redo stack via undo first.
    // Push a second snapshot so undo→redo path is testable
    client.state.issues.set('a', { ...issue, startDate: 100, dueDate: 200 } as Issue)
    // Now mgr state: undoStack=[entry], current=after → undo succeeds and pushes to redo
    const u = await mgr.undo()
    expect(u.kind).toBe('success')
    // Now externally mutate the issue so redo conflicts (current ≠ before)
    client.state.issues.set('a', { ...issue, startDate: 7777, dueDate: 8888 } as Issue)
    const r = await mgr.redo()
    expect(r.kind).toBe('conflicted')
  })
})

describe('UndoManager — relation entries', () => {
  it('undo of relation-create issues a removeCollection', async () => {
    const rel = makeRelation('r1', 'a', 'b')
    const client = makeClient({ relations: [rel] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-create',
      relation: rel,
      description: 'Create dep a→FS→b'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('success')
    expect(client.state.mockOps.removed).toHaveLength(1)
    expect(client.state.mockOps.removed[0].id).toBe('r1')
    expect(client.state.relations.has('r1')).toBe(false)
  })

  it('redo of relation-create re-adds with the SAME _id', async () => {
    const rel = makeRelation('r1', 'a', 'b')
    const client = makeClient({ relations: [rel] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-create',
      relation: rel,
      description: 'Create dep a→FS→b'
    })
    await mgr.undo()
    expect(client.state.relations.has('r1')).toBe(false)
    const r = await mgr.redo()
    expect(r.kind).toBe('success')
    expect(client.state.mockOps.added).toHaveLength(1)
    expect(client.state.mockOps.added[0].id).toBe('r1')
    expect(client.state.relations.has('r1')).toBe(true)
  })

  it('undo of relation-delete re-adds with the SAME _id', async () => {
    const rel = makeRelation('r1', 'a', 'b')
    const client = makeClient({ relations: [] }) // simulate: already deleted
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-delete',
      relation: rel,
      description: 'Delete dep r1'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('success')
    expect(client.state.mockOps.added).toHaveLength(1)
    expect(client.state.mockOps.added[0].id).toBe('r1')
  })

  it('redo of relation-delete removes the doc again', async () => {
    const rel = makeRelation('r1', 'a', 'b')
    const client = makeClient({ relations: [] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-delete',
      relation: rel,
      description: 'Delete dep r1'
    })
    await mgr.undo()
    expect(client.state.relations.has('r1')).toBe(true)
    const r = await mgr.redo()
    expect(r.kind).toBe('success')
    expect(client.state.relations.has('r1')).toBe(false)
  })

  it('undo of relation-edit restores before {kind, lag}', async () => {
    const rel = makeRelation('r1', 'a', 'b', 'start-to-start', 5)
    const client = makeClient({ relations: [rel] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-edit',
      relationId: 'r1' as Ref<IssueRelation>,
      relationSpace: space,
      before: { kind: 'finish-to-start', lag: 0 },
      after: { kind: 'start-to-start', lag: 5 },
      description: 'Edit dep r1'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('success')
    expect(client.state.mockOps.updates[0].update).toEqual({ kind: 'finish-to-start', lag: 0 })
  })

  it('redo of relation-edit reapplies after {kind, lag}', async () => {
    const rel = makeRelation('r1', 'a', 'b', 'start-to-start', 5)
    const client = makeClient({ relations: [rel] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-edit',
      relationId: 'r1' as Ref<IssueRelation>,
      relationSpace: space,
      before: { kind: 'finish-to-start', lag: 0 },
      after: { kind: 'start-to-start', lag: 5 },
      description: 'Edit dep r1'
    })
    await mgr.undo()
    const r = await mgr.redo()
    expect(r.kind).toBe('success')
    // Last update should be the "after" state
    const last = client.state.mockOps.updates[client.state.mockOps.updates.length - 1]
    expect(last.update).toEqual({ kind: 'start-to-start', lag: 5 })
  })

  it('undo of relation-delete returns conflicted if re-create would form a cycle', async () => {
    // Existing graph: b→a (FS). Deleted relation was a→b (FS). Restoring it
    // would create a cycle a→b→a.
    const existing = makeRelation('r2', 'b', 'a')
    const deleted = makeRelation('r1', 'a', 'b')
    const client = makeClient({ relations: [existing] })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-delete',
      relation: deleted,
      description: 'Delete a→b'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('conflicted')
    // No write happened
    expect(client.state.mockOps.added).toHaveLength(0)
  })

  it('undo of relation-create returns conflicted if the relation is already gone', async () => {
    const rel = makeRelation('r1', 'a', 'b')
    const client = makeClient({ relations: [] }) // someone else deleted
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'relation-create',
      relation: rel,
      description: 'Create dep'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('conflicted')
    expect(client.state.mockOps.removed).toHaveLength(0)
  })
})

// D — explicit coverage for the spec'd cascade-undo atomicity and
// the conflict-drops-frame contract that GanttView's notification path
// relies on.
describe('UndoManager — cascade atomicity & conflict-drops-frame', () => {
  it('undo of a 5-issue cascade-frame applies all 5 tx in ONE commit', async () => {
    const issues: Issue[] = []
    for (let i = 0; i < 5; i++) issues.push(makeIssue(`i${i}`, 100 + i * 10, 200 + i * 10))
    const client = makeClient({ issues })
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-batch',
      changes: issues.map((iss, idx) => ({
        issueId: String(iss._id) as Ref<Issue>,
        issueSpace: space,
        before: { startDate: 50 + idx * 10, dueDate: 150 + idx * 10 },
        after: { startDate: 100 + idx * 10, dueDate: 200 + idx * 10 }
      })),
      description: 'Cascade: 5 issues shifted'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('success')
    // All 5 updates land in the same apply() / single commit
    expect(client.state.mockOps.updates).toHaveLength(5)
    // Every issue rolled back to its "before"
    for (let i = 0; i < 5; i++) {
      expect(client.state.issues.get(`i${i}`)?.startDate).toBe(50 + i * 10)
      expect(client.state.issues.get(`i${i}`)?.dueDate).toBe(150 + i * 10)
    }
  })

  it('cascade-undo fails atomically: commit throw leaves no partial state change', async () => {
    const issues: Issue[] = []
    for (let i = 0; i < 4; i++) issues.push(makeIssue(`i${i}`, 100 + i, 200 + i))
    const snapshotBefore = issues.map((i) => ({ ...i }))
    const client = makeClient({ issues })
    client.state.failNextCommit = true
    const mgr = new UndoManager(client)
    mgr.push({
      kind: 'date-batch',
      changes: issues.map((iss, idx) => ({
        issueId: String(iss._id) as Ref<Issue>,
        issueSpace: space,
        before: { startDate: 50 + idx, dueDate: 150 + idx },
        after: { startDate: 100 + idx, dueDate: 200 + idx }
      })),
      description: 'Cascade: 4 issues shifted'
    })
    const r = await mgr.undo()
    expect(r.kind).toBe('error')
    // None of the issues mutated — pending writes never ran because
    // commit threw before applying them.
    for (let i = 0; i < 4; i++) {
      const cur = client.state.issues.get(`i${i}`)
      expect(cur?.startDate).toBe(snapshotBefore[i].startDate)
      expect(cur?.dueDate).toBe(snapshotBefore[i].dueDate)
    }
    // Errored frame is dropped from the undo stack — NOT re-pushed.
    expect(mgr.undoStackDepthForTest()).toBe(0)
    expect(mgr.canUndo.get()).toBe(false)
  })

  it('conflict drops the frame from the stack (no re-push, no redo entry)', async () => {
    const issue = makeIssue('a', 9999, 9999) // current diverges from after
    const client = makeClient({ issues: [issue] })
    const mgr = new UndoManager(client)
    mgr.push(dateChange('a', 50, 150, 100, 200))
    expect(mgr.undoStackDepthForTest()).toBe(1)
    const r = await mgr.undo()
    expect(r.kind).toBe('conflicted')
    // Frame is consumed (not requeued) so a second Ctrl-Z does NOT loop
    // on the same toast — see GanttView.showUndoResultToast comment.
    expect(mgr.undoStackDepthForTest()).toBe(0)
    expect(mgr.redoStackDepthForTest()).toBe(0)
    expect(mgr.canUndo.get()).toBe(false)
    expect(mgr.canRedo.get()).toBe(false)
  })

  it('conflicted result carries the original entry (for debug logging)', async () => {
    const issue = makeIssue('a', 9999, 9999)
    const client = makeClient({ issues: [issue] })
    const mgr = new UndoManager(client)
    const entry = dateChange('a', 50, 150, 100, 200)
    mgr.push(entry)
    const r = await mgr.undo()
    expect(r.kind).toBe('conflicted')
    if (r.kind === 'conflicted') {
      // GanttView's showUndoResultToast walks `r.entry` for `console.warn`
      // payload — this contract must not regress.
      expect(r.entry).toBe(entry)
    }
  })
})
