<script lang="ts">
  import { Issue } from '@hcengineering/tracker'
  import { Button, IconClose } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import PriorityRefPresenter from './PriorityRefPresenter.svelte'

  export let issue: Issue
  const dispatch = createEventDispatcher()
  console.log('issue from dependency', issue)
  console.log('tracker.string dependency', tracker.string)
</script>

<span class="overflow-label">{'Dependency Issue'}</span>
<div class="dependencyIssue-container">
  <div class="flex-no-shrink mr-1-5">
    <PriorityRefPresenter value={issue.priority} shouldShowLabel={false} />
  </div>
  <span class="overflow-label flex-no-shrink content-dark-color">{issue.identifier}</span>
  <span class="overflow-label issue-title">{issue.title}</span>
  <Button
    icon={IconClose}
    showTooltip={{ label: tracker.string.RemoveDependency, direction: 'bottom' }}
    kind={'ghost'}
    size={'small'}
    on:click={() => dispatch('close')}
  />
</div>

<style lang="scss">
  .dependencyIssue-container {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.25rem 0.25rem 0.75rem;
    max-width: fit-content;
    min-width: 0;
    // line-height: 150%;
    height: 2.25rem;
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
  }

  .issue-title {
    margin: 0 0.25rem 0 0.375rem;
    padding-right: 0.75rem;
    min-width: 0;
    color: var(--theme-caption-color);
    border-right: 1px solid var(--theme-button-border);
  }
</style>
