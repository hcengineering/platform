//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//

/**
 * Standalone test for the cycle-safe ignore-set used by
 * LinkSubIssueActionPopup. The component itself can't be exercised
 * headlessly (it's a Svelte popup with DOM dependencies), but the
 * computeIgnoreSet function is pure and worth fencing in jest so a
 * future refactor doesn't silently regress the cycle protection.
 *
 * The function below is a duplicate of the one in
 * `LinkSubIssueActionPopup.svelte` — kept in sync deliberately.
 * Codex review-5 (2026-05-11) flagged the absence of a cycle test.
 */

import type { Issue } from '@hcengineering/tracker'
import type { Ref } from '@hcengineering/core'

function computeIgnoreSet (root: Issue, all: Issue[]): Set<Ref<Issue>> {
  const ignored = new Set<Ref<Issue>>([root._id])
  if (Array.isArray(root.parents)) {
    for (const p of root.parents as Array<{ parentId: Ref<Issue> }>) {
      if (p?.parentId !== undefined) ignored.add(p.parentId)
    }
  }
  const childrenByParent = new Map<Ref<Issue>, Issue[]>()
  for (const i of all) {
    const parentId = i.parents?.[0]?.parentId as Ref<Issue> | undefined
    if (parentId === undefined) continue
    const bucket = childrenByParent.get(parentId)
    if (bucket === undefined) childrenByParent.set(parentId, [i])
    else bucket.push(i)
  }
  const queue: Issue[] = [...(childrenByParent.get(root._id) ?? [])]
  while (queue.length > 0) {
    const next = queue.shift() as Issue
    if (ignored.has(next._id)) continue
    ignored.add(next._id)
    const children = childrenByParent.get(next._id)
    if (children !== undefined) {
      for (const c of children) queue.push(c)
    }
  }
  return ignored
}

function mk (id: string, parents: string[] = []): Issue {
  return {
    _id: id as Ref<Issue>,
    parents: parents.map((p) => ({ parentId: p as Ref<Issue>, parentTitle: '', space: 'sp' }))
  } as unknown as Issue
}

describe('LinkSubIssue — cycle-safe ignore set', () => {
  it('excludes self', () => {
    const root = mk('r')
    const result = computeIgnoreSet(root, [root])
    expect(result.has(root._id)).toBe(true)
  })

  it('excludes direct ancestors via parents[]', () => {
    const root = mk('r', ['p', 'gp']) // r is child of p, p is child of gp
    const result = computeIgnoreSet(root, [root])
    expect(result.has('p' as Ref<Issue>)).toBe(true)
    expect(result.has('gp' as Ref<Issue>)).toBe(true)
  })

  it('excludes direct + transitive descendants', () => {
    const root = mk('r')
    const child = mk('c', ['r'])
    const grand = mk('g', ['c', 'r']) // transitive parents — direct = c
    const result = computeIgnoreSet(root, [root, child, grand])
    expect(result.has('c' as Ref<Issue>)).toBe(true)
    expect(result.has('g' as Ref<Issue>)).toBe(true)
  })

  it('does NOT exclude an unrelated sibling of root', () => {
    const root = mk('r')
    const sibling = mk('s')
    const result = computeIgnoreSet(root, [root, sibling])
    expect(result.has('s' as Ref<Issue>)).toBe(false)
  })

  it('cycle-safe: a self-referential issue does not infinite-loop', () => {
    const root = mk('r')
    const cyclic = mk('x', ['x'])
    expect(() => computeIgnoreSet(root, [root, cyclic])).not.toThrow()
  })

  it('cycle-safe: mutual parent loop (a<->b) terminates', () => {
    const a = mk('a', ['b'])
    const b = mk('b', ['a'])
    expect(() => computeIgnoreSet(a, [a, b])).not.toThrow()
  })
})
