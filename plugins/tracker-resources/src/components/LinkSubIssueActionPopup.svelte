<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import core, { type FindOptions, type Rank, type Ref, SortingOrder } from '@hcengineering/core'
  import { ObjectPopup, createQuery, getClient } from '@hcengineering/presentation'
  import { makeRank } from '@hcengineering/task'
  import { type Issue } from '@hcengineering/tracker'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../plugin'
  import IssueStatusIcon from './issues/IssueStatusIcon.svelte'

  /**
   * Inverted parent-picker: instead of choosing a parent for the current
   * issue, choose a CHILD to attach under the current issue. The picker
   * shows every issue in the space that is not already a descendant or an
   * ancestor of `value`, on confirm updates that picked issue's
   * `attachedTo` to point to `value._id`.
   *
   * Cycle-safe ignore set (review note (2026-05-11)):
   * - `value._id` itself
   * - all ancestors of `value` (so the picker can't make the parent a child
   *   of its own descendant — would create a cycle)
   * - all transitive descendants of `value` (so already-linked sub-issues
   *   and their sub-trees aren't offered)
   *
   * Used by the Gantt context-menu Hierarchy ▸ Link existing as sub-issue
   * and by EditIssue's SubIssues panel.
   */
  export let value: Issue
  export let width: 'medium' | 'large' | 'full' | 'resizable' = 'resizable'

  const client = getClient()
  const dispatch = createEventDispatcher()
  const allIssuesQuery = createQuery()
  let spaceIssues: Issue[] = []

  $: allIssuesQuery.query(tracker.class.Issue, { space: value.space }, (res: Issue[]) => {
    spaceIssues = res
  })

  const options: FindOptions<Issue> = {
    lookup: {
      status: [tracker.class.IssueStatus, { category: core.class.StatusCategory }]
    },
    sort: { modifiedOn: SortingOrder.Descending }
  }

  $: ignoreObjects = computeIgnoreSet(value, spaceIssues)

  /**
   * BFS over the parent->children edge (issue.parents[0].parentId pointer,
   * matching layout.ts:52 and scheduler.descendantsWithDates) to collect
   * the full descendant set, plus a walk up issue.parents[] to collect all
   * ancestors. Result includes `value._id`. Cycle-protected via a visited
   * set so a buggy outline a->b->a does not infinite-loop.
   */
  function computeIgnoreSet (root: Issue, all: Issue[]): Ref<Issue>[] {
    const ignored = new Set<Ref<Issue>>([root._id])
    // Ancestors: walk root.parents[] explicitly — that's the breadcrumb chain.
    if (Array.isArray(root.parents)) {
      for (const p of root.parents as Array<{ parentId: Ref<Issue> }>) {
        if (p?.parentId !== undefined) ignored.add(p.parentId)
      }
    }
    // Descendants: BFS over parents[0].parentId pointers.
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
    return Array.from(ignored)
  }

  async function onClose ({ detail: pickedChild }: CustomEvent<Issue | undefined | null>): Promise<void> {
    if (pickedChild !== undefined && pickedChild !== null && pickedChild._id !== value._id) {
      // Move the picked issue's existing rank to the end of the new parent's
      // children so it sorts after them, matching the SetParentIssueActionPopup
      // pattern (utils.ts: makeRank).
      const lastAttached = await client.findOne<Issue>(
        tracker.class.Issue,
        { attachedTo: value._id },
        { sort: { rank: SortingOrder.Descending } }
      )
      const rank: Rank = makeRank(lastAttached?.rank, undefined)

      await client.update(pickedChild, {
        attachedTo: value._id,
        rank
      })
    }
    dispatch('close', pickedChild)
  }
</script>

<ObjectPopup
  _class={tracker.class.Issue}
  docQuery={{ space: value.space }}
  {options}
  groupBy={'$lookup.status'}
  {ignoreObjects}
  shadows={true}
  searchField={'title'}
  placeholder={tracker.string.AddSubIssues}
  bind:width
  on:close={onClose}
>
  <svelte:fragment slot="item" let:item={issue}>
    <div class="flex-row-center flex-grow gap-2">
      <IssueStatusIcon value={issue} size="small" />
      <span class="overflow-label">{issue.title}</span>
    </div>
  </svelte:fragment>
</ObjectPopup>
