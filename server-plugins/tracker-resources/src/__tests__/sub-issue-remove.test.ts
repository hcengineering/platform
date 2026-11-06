//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

// Every ancestor of an issue keeps a `childInfo` entry (estimation and
// reported time) for it. Removing the issue must pull that entry again.
//
// The fake storage only supports plain field matches (like the Postgres
// adapter, it cannot match a field nested in a JSON array such as
// `childInfo.childId`), so the trigger has to use the removed issue itself.

import core, { type Tx, type TxUpdateDoc } from '@hcengineering/core'
import tracker, { type Issue } from '@hcengineering/tracker'
import { OnIssueUpdate } from '../index'

const SPACE = 'project'

interface FakeIssue {
  _id: string
  _class: string
  space: string
  identifier: string
  title: string
  attachedTo: string
  parents: Array<{ parentId: string, identifier: string, parentTitle: string, space: string }>
}

function mk (_id: string, attachedTo: string = tracker.ids.NoParent, parents: FakeIssue['parents'] = []): FakeIssue {
  return {
    _id,
    _class: tracker.class.Issue,
    space: SPACE,
    identifier: `P-${_id}`,
    title: `Title ${_id}`,
    attachedTo,
    parents
  }
}

function info (issue: FakeIssue): FakeIssue['parents'][number] {
  return { parentId: issue._id, identifier: issue.identifier, parentTitle: issue.title, space: issue.space }
}

function makeControl (issues: FakeIssue[], removed: FakeIssue[]): any {
  const findAll = jest.fn(async (_ctx: unknown, _class: unknown, q: any) => {
    if (_class !== tracker.class.Issue) return []
    for (const key of Object.keys(q)) {
      if (key !== '_id') throw new Error(`unsupported query key ${key}`)
    }
    return issues.filter((i) => i._id === q._id)
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
  const removedMap = new Map(removed.map((it) => [it._id, it]))
  return { ctx: {}, findAll, txFactory, hierarchy, removedMap }
}

function removeTx (issue: FakeIssue, attachedTo?: string): any {
  return {
    _class: core.class.TxRemoveDoc,
    objectClass: tracker.class.Issue,
    objectSpace: issue.space,
    objectId: issue._id,
    attachedTo,
    attachedToClass: attachedTo !== undefined ? tracker.class.Issue : undefined,
    collection: attachedTo !== undefined ? 'subIssues' : undefined
  }
}

function pulled (res: any[]): string[] {
  return res
    .filter((tx) => tx.operations?.$pull?.childInfo !== undefined)
    .map((tx) => `${tx.objectId as string}:${tx.operations.$pull.childInfo.childId as string}`)
}

describe('OnIssueUpdate: removed sub-issue', () => {
  it('pulls the childInfo entry from every ancestor', async () => {
    const top = mk('t')
    const parent = mk('p', 't', [info(top)])
    const child = mk('c', 'p', [info(parent), info(top)])
    const control = makeControl([top, parent], [child])

    const res = await OnIssueUpdate([removeTx(child, 'p')], control)

    expect(pulled(res)).toEqual(['p:c', 't:c'])
    const updates = res.filter((tx: Tx): tx is TxUpdateDoc<Issue> => tx._class === core.class.TxUpdateDoc)
    expect(updates.every((tx) => tx.operations.$push === undefined)).toBe(true)
  })

  it('falls back to attachedTo when the removed issue is not known', async () => {
    const top = mk('t')
    const parent = mk('p', 't', [info(top)])
    const child = mk('c', 'p', [info(parent), info(top)])
    const control = makeControl([top, parent], [])

    const res = await OnIssueUpdate([removeTx(child, 'p')], control)

    expect(pulled(res)).toEqual(['p:c', 't:c'])
  })

  it('skips ancestors removed together with the issue', async () => {
    const top = mk('t')
    const parent = mk('p', 't', [info(top)])
    const child = mk('c', 'p', [info(parent), info(top)])
    const control = makeControl([top], [parent, child])

    const res = await OnIssueUpdate([removeTx(child, 'p')], control)

    expect(pulled(res)).toEqual(['t:c'])
  })

  it('emits nothing for a top-level issue', async () => {
    const issue = mk('i')
    const control = makeControl([], [issue])

    expect(pulled(await OnIssueUpdate([removeTx(issue)], control))).toEqual([])
  })
})
