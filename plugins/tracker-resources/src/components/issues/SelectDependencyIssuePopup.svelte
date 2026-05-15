<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<script lang="ts">
  import core, { type FindOptions, type Ref, SortingOrder } from '@hcengineering/core'
  import { ObjectPopup } from '@hcengineering/presentation'
  import type { Issue, IssueRelation } from '@hcengineering/tracker'
  import tracker from '../../plugin'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  /**
   * Project-scoped issue picker for the Dependencies panel.
   *
   * Wraps ObjectPopup so it can pass a `slot="item"` — without that slot
   * the popup queries items but renders nothing (default ObjectPopup item
   * fragment is `{#if $$slots.item}...`). Mirrors
   * SetParentIssueActionPopup's structure with two differences:
   *   - docQuery scopes to `issue.space` (Phase-1 deps are intra-project)
   *   - ignoreObjects excludes self and existing successors
   */
  export let issue: Issue
  export let outgoing: IssueRelation[] = []

  const options: FindOptions<Issue> = {
    lookup: {
      status: [tracker.class.IssueStatus, { category: core.class.StatusCategory }]
    },
    sort: { modifiedOn: SortingOrder.Descending }
  }

  $: ignoreObjects = [issue._id, ...outgoing.map((r) => r.target)] as Ref<Issue>[]
</script>

<ObjectPopup
  _class={tracker.class.Issue}
  docQuery={{ space: issue.space }}
  {options}
  {ignoreObjects}
  placeholder={tracker.string.SelectIssue}
  category={tracker.completion.IssueCategory}
  searchMode={'spotlight'}
  multiSelect={false}
  allowDeselect={false}
  shadows={true}
  width={'resizable'}
  on:update
  on:close
>
  <svelte:fragment slot="item" let:item={target}>
    <div class="flex-center clear-mins w-full h-9">
      {#if target?.$lookup?.status}
        <div class="icon mr-4 h-8">
          <IssueStatusIcon value={target.$lookup.status} taskType={target.kind} space={target.space} size="small" />
        </div>
      {/if}
      <span class="overflow-label flex-no-shrink mr-3">{target.identifier}</span>
      <span class="overflow-label w-full content-color">{target.title}</span>
    </div>
  </svelte:fragment>
</ObjectPopup>
