<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import { GithubPullRequestState } from '@hcengineering/github'
  import github from '../../plugin'

  export let value: GithubPullRequestState
  export let accent = false
</script>

<div class="p-1" class:fs-bold={accent}>
  {#if value === GithubPullRequestState.open}
    <Label label={github.string.PROpen} />
  {:else if value === GithubPullRequestState.merged}
    <Label label={github.string.PRMerged} />
  {:else if value === GithubPullRequestState.closed}
    <Label label={github.string.PRClosed} />
  {/if}
</div>
