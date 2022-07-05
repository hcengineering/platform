<script lang="ts">
  import { DocumentQuery, FindOptions, Ref, SortingOrder } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { ObjectPopup } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { getIssueId } from '../issues'
  import tracker from '../plugin'
  import IssueStatusIcon from './issues/IssueStatusIcon.svelte'

  export let docQuery: DocumentQuery<Issue> | undefined = undefined
  export let ignoreObjects: Ref<Issue>[] | undefined = undefined
  export let placeholder: IntlString | undefined = undefined
  export let width: 'medium' | 'large' | 'full' = 'large'

  const options: FindOptions<Issue> = {
    lookup: {
      status: [tracker.class.IssueStatus, { category: tracker.class.IssueStatusCategory }],
      space: tracker.class.Team
    },
    sort: { modifiedOn: SortingOrder.Descending }
  }
</script>

<ObjectPopup
  _class={tracker.class.Issue}
  {options}
  {docQuery}
  {placeholder}
  {ignoreObjects}
  {width}
  searchField="title"
  groupBy="space"
  on:update
  on:close
>
  <svelte:fragment slot="item" let:item={issue}>
    {@const issueId = getIssueId(issue.$lookup.space, issue)}
    {#if issueId}
      <div class="flex-center clear-mins w-full h-9">
        {#if issue?.$lookup?.status}
          <div class="icon mr-4 h-8">
            <IssueStatusIcon value={issue.$lookup.status} size="small" />
          </div>
        {/if}
        <span class="overflow-label flex-no-shrink mr-3">{issueId}</span>
        <span class="overflow-label w-full issue-title">{issue.title}</span>
      </div>
    {/if}
  </svelte:fragment>
</ObjectPopup>
