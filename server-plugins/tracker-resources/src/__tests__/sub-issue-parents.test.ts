//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

// Sub-issues keep a denormalised copy of their ancestors (`parents`: title,
// identifier, space). Moving an issue tree to another project renumbers every
// issue of the tree in one batch, so the copies must be re-synced at every
// depth without the per-ancestor updates overwriting each other.
//
// The fake storage only supports plain field matches (like the Postgres
// adapter, it cannot match a field nested in a JSON array such as
// `parents.parentId`), so the trigger has to walk the `attachedTo` links.

import core from '@hcengineering/core'
import tracker from '@hcengineering/tracker'
import { OnIssueUpdate } from '../index'
import { buildParentInfo } from '../utils'

const OLD = 'old-project'
const NEW = 'new-project'
const NO_PARENT: string = tracker.ids.NoParent

interface FakeIssue {
  _id: string
  _class: string
  space: string
  identifier: string
  title: string
  attachedTo: string
  parents: Array<{ parentId: string, identifier: string, parentTitle: string, space: string }>
}

function mk (
  _id: string,
  space: string,
  identifier: string,
  attachedTo: string = NO_PARENT,
  parents: FakeIssue['parents'] = []
): FakeIssue {
  return { _id, _class: tracker.class.Issue, space, identifier, title: `Title ${_id}`, attachedTo, parents }
}

function info (issue: FakeIssue, identifier = issue.identifier, space = issue.space): FakeIssue['parents'][number] {
  return { parentId: issue._id, identifier, parentTitle: issue.title, space }
}

function matches (value: unknown, criteria: any): boolean {
  if (criteria !== null && typeof criteria === 'object') {
    if (Array.isArray(criteria.$in)) return criteria.$in.includes(value)
    throw new Error(`unsupported criteria ${JSON.stringify(criteria)}`)
  }
  return value === criteria
}

function makeControl (issues: FakeIssue[]): any {
  const findAll = jest.fn(async (_ctx: unknown, _class: unknown, q: any) => {
    if (_class !== tracker.class.Issue) return []
    for (const key of Object.keys(q)) {
      if (key !== '_id' && key !== 'attachedTo') throw new Error(`unsupported query key ${key}`)
    }
    return issues.filter(
      (i) => (q._id === undefined || matches(i._id, q._id)) && (q.attachedTo === undefined || matches(i.attachedTo, q.attachedTo))
    )
  })
  const txFactory = {
    createTxUpdateDoc: (_class: any, space: any, objectId: any, operations: any) => ({
      _class: core.class.TxUpdateDoc,
      objectClass: _class,
      objectSpace: space,
      objectId,
      operations
    })
  }
  const hierarchy = { isDerived: (a: unknown, b: unknown) => a === b }
  return { ctx: {}, findAll, txFactory, hierarchy, removedMap: new Map() }
}

function updateTx (issue: FakeIssue, objectSpace: string, operations: Record<string, unknown>): any {
  return {
    _class: core.class.TxUpdateDoc,
    objectClass: tracker.class.Issue,
    objectSpace,
    objectId: issue._id,
    operations
  }
}

function parentsUpdates (res: any[]): Map<string, any[]> {
  const out = new Map<string, any[]>()
  for (const tx of res) {
    if (tx.operations?.parents === undefined) continue
    out.set(tx.objectId, [...(out.get(tx.objectId) ?? []), tx.operations.parents])
  }
  return out
}

describe('OnIssueUpdate: sub-issue parents info', () => {
  it('re-syncs identifier and space at every depth after a tree is moved', async () => {
    // Stored state after the client's move batch: every issue already has its
    // new space and identifier, but the parents info is still the old one.
    const parent = mk('p', NEW, 'NEW-1')
    const child = mk('c', NEW, 'NEW-2', 'p', [info(parent, 'OLD-1', OLD)])
    const grandChild = mk('g', NEW, 'NEW-3', 'c', [info(child, 'OLD-2', OLD), info(parent, 'OLD-1', OLD)])
    const control = makeControl([parent, child, grandChild])

    const res = await OnIssueUpdate(
      [
        updateTx(grandChild, OLD, { space: NEW, identifier: 'NEW-3', number: 3 }),
        updateTx(child, OLD, { space: NEW, identifier: 'NEW-2', number: 2 }),
        updateTx(parent, OLD, { space: NEW, identifier: 'NEW-1', number: 1 })
      ],
      control
    )

    const updates = parentsUpdates(res)
    expect(updates.get('c')).toEqual([[info(parent)]])
    expect(updates.get('g')).toEqual([[info(child), info(parent)]])
    expect(updates.has('p')).toBe(false)
    for (const tx of res) {
      expect(tx.objectSpace).toBe(NEW)
    }
  })

  it('drops the old parent when a sub-issue is moved without it', async () => {
    // OLD-1 > OLD-2 > OLD-3, only OLD-2 (with its sub-issue) is moved: the
    // move detaches it from OLD-1 in the same update.
    const top = mk('t1', OLD, 'OLD-1')
    const moved = mk('t2', NEW, 'NEW-1', NO_PARENT, [info(top)])
    const sub = mk('t3', NEW, 'NEW-2', 't2', [info(moved, 'OLD-2', OLD), info(top)])
    const control = makeControl([top, moved, sub])

    const res = await OnIssueUpdate(
      [
        updateTx(sub, OLD, { space: NEW, identifier: 'NEW-2', number: 2 }),
        updateTx(moved, OLD, {
          space: NEW,
          identifier: 'NEW-1',
          number: 1,
          attachedTo: NO_PARENT,
          attachedToClass: tracker.class.Issue
        })
      ],
      control
    )

    const updates = parentsUpdates(res)
    expect(updates.get('t2')).toEqual([[]])
    expect(updates.get('t3')).toEqual([[info(moved)]])
    expect(updates.has('t1')).toBe(false)
  })

  it('re-syncs the chain of a re-parented issue and its sub-issues', async () => {
    const oldParent = mk('o', OLD, 'OLD-1')
    const grand = mk('n0', OLD, 'OLD-5')
    const newParent = mk('n', OLD, 'OLD-2', 'n0', [info(grand)])
    const issue = mk('i', OLD, 'OLD-3', 'n', [info(oldParent)])
    const sub = mk('s', OLD, 'OLD-4', 'i', [info(issue), info(oldParent)])
    const control = makeControl([oldParent, grand, newParent, issue, sub])

    const res = await OnIssueUpdate([updateTx(issue, OLD, { attachedTo: 'n' })], control)

    const updates = parentsUpdates(res)
    expect(updates.get('i')).toEqual([[info(newParent), info(grand)]])
    expect(updates.get('s')).toEqual([[info(issue), info(newParent), info(grand)]])
  })

  it('re-syncs the parent title of all descendants', async () => {
    const parent = mk('p', OLD, 'OLD-1')
    parent.title = 'Renamed'
    const child = mk('c', OLD, 'OLD-2', 'p', [{ ...info(parent), parentTitle: 'Original' }])
    const grandChild = mk('g', OLD, 'OLD-3', 'c', [info(child), { ...info(parent), parentTitle: 'Original' }])
    const control = makeControl([parent, child, grandChild])

    const res = await OnIssueUpdate([updateTx(parent, OLD, { title: 'Renamed' })], control)

    const updates = parentsUpdates(res)
    expect(updates.get('c')).toEqual([[info(parent)]])
    expect(updates.get('g')).toEqual([[info(child), info(parent)]])
  })

  it('emits nothing when the parents info is already up to date', async () => {
    const parent = mk('p', NEW, 'NEW-1')
    const child = mk('c', NEW, 'NEW-2', 'p', [info(parent)])
    const control = makeControl([parent, child])

    const res = await OnIssueUpdate([updateTx(parent, OLD, { space: NEW, identifier: 'NEW-1' })], control)

    expect(parentsUpdates(res).size).toBe(0)
  })
})

describe('buildParentInfo', () => {
  it('walks attachedTo up to the top-level issue', () => {
    const p = mk('p', NEW, 'NEW-1')
    const c = mk('c', NEW, 'NEW-2', 'p')
    const g = mk('g', NEW, 'NEW-3', 'c')
    const docs = new Map<any, any>([p, c, g].map((it) => [it._id, it]))
    expect(buildParentInfo(g as any, docs)).toEqual([info(c), info(p)])
    expect(buildParentInfo(p as any, docs)).toEqual([])
  })

  it('falls back to the stored chain of an ancestor that is not loaded', () => {
    const top = mk('t', OLD, 'OLD-1')
    const c = mk('c', NEW, 'NEW-2', 't', [info(top)])
    const g = mk('g', NEW, 'NEW-3', 'c')
    const docs = new Map<any, any>([c, g].map((it) => [it._id, it]))
    expect(buildParentInfo(g as any, docs)).toEqual([info(c), info(top)])
  })

  it('stops on an attachedTo cycle', () => {
    const a = mk('a', NEW, 'NEW-1', 'b')
    const b = mk('b', NEW, 'NEW-2', 'a')
    const docs = new Map<any, any>([a, b].map((it) => [it._id, it]))
    expect(buildParentInfo(a as any, docs)).toEqual([info(b)])
  })
})
