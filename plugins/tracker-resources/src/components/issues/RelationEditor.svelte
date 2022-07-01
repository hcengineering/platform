<script lang="ts">
  import { WithLookup } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { Icon, IconClose } from '@anticrm/ui'
  import { getIssueId, updateIssueRelation } from '../../issues'
  import tracker from '../../plugin'

  export let value: Issue
  export let type: 'isBlocking' | 'blockedBy' | 'relatedIssue'

  const client = getClient()
  const issuesQuery = createQuery()

  // TODO: fix icon
  $: icon = tracker.icon.Issue
  $: query = type === 'isBlocking' ? { blockedBy: value._id } : { _id: { $in: value[type] } }
  let issues: WithLookup<Issue>[] = []
  $: issuesQuery.query(
    tracker.class.Issue,
    query,
    (result) => {
      issues = result
    },
    { lookup: { space: tracker.class.Team } }
  )

  async function handleClick (issue: Issue) {
    const prop = type === 'isBlocking' ? 'blockedBy' : type
    if (type !== 'isBlocking') {
      await updateIssueRelation(client, value, issue._id, prop, '$pull')
    }
    if (type !== 'blockedBy') {
      await updateIssueRelation(client, issue, value._id, prop, '$pull')
    }
  }
</script>

<div class="flex-column">
  {#each issues as issue}
    {#if issue.$lookup?.space}
      <div class="tag-container">
        <Icon {icon} size={'small'} />
        <span class="overflow-label ml-1-5 caption-color">{getIssueId(issue.$lookup.space, issue)}</span>
        <button class="btn-close" on:click|stopPropagation={() => handleClick(issue)}>
          <Icon icon={IconClose} size={'x-small'} />
        </button>
      </div>
    {/if}
  {/each}
</div>

<style lang="scss">
  .tag-container {
    overflow: hidden;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding-left: 0.5rem;
    height: 1.5rem;
    min-width: 0;
    min-height: 0;
    border-radius: 0.5rem;
    width: fit-content;
    &:hover {
      border: 1px solid var(--divider-color);
    }

    .btn-close {
      flex-shrink: 0;
      margin-left: 0.125rem;
      padding: 0 0.25rem 0 0.125rem;
      height: 1.75rem;
      color: var(--content-color);
      border-left: 1px solid transparent;

      &:hover {
        color: var(--caption-color);
        border-left-color: var(--divider-color);
      }
    }
  }
</style>
