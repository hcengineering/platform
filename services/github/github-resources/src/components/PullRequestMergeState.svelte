<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { Issue } from '@hcengineering/tracker'
  import { ButtonSize, Icon, Label } from '@hcengineering/ui'
  import { GithubPullRequest, GithubPullRequestState } from '@hcengineering/github'
  import github from '../plugin'
  import PullRequestReviewDecisionValuePresenter from './presenters/PullRequestReviewDecisionValuePresenter.svelte'

  export let value: Issue
  export let size: ButtonSize = 'medium'
  export let small = false

  $: pr = getClient().getHierarchy().isDerived(value?._class, github.class.GithubPullRequest)
    ? (value as GithubPullRequest)
    : undefined
</script>

{#if pr}
  {#if pr.state === GithubPullRequestState.open}
    <div class="ml-4">
      <PullRequestReviewDecisionValuePresenter value={pr.reviewDecision} {small} />
    </div>

    {#if pr.mergeable === 'CONFLICTING' && !small}
      <div class="ml-4">
        <Label label={github.string.Conflict} />
      </div>
    {/if}
  {:else if pr.state === GithubPullRequestState.merged}
    <div class:ml-4={!small} class="flex-row-center" class:flex-no-shrink={small}>
      <Icon icon={github.icon.PullRequestMerged} size={'small'} />
      {#if !small}
        <Label label={github.string.PRMerged} />
      {/if}
    </div>
  {:else if pr.state === GithubPullRequestState.closed}
    <div class:ml-4={!small} class="flex-row-center" class:flex-no-shrink={small}>
      <Icon icon={github.icon.PullRequestClosed} size={'small'} />
      {#if !small}
        <Label label={github.string.PRClosed} />
      {/if}
    </div>
  {/if}
{/if}
