<script lang="ts">
  import { Issue } from '@hcengineering/tracker'

  import { getClient } from '@hcengineering/presentation'
  import { HyperlinkEditor } from '@hcengineering/view-resources'
  import github from '../../plugin'
  import { integrationRepositories } from '../utils'

  export let value: Issue

  $: ghIssue = getClient().getHierarchy().asIf(value, github.mixin.GithubIssue)

  $: repository = ghIssue?.repository !== undefined ? $integrationRepositories.get(ghIssue?.repository) : undefined
</script>

{#if ghIssue !== undefined && ghIssue.url !== '' && repository !== undefined}
  <div class="flex flex-row-center">
    <HyperlinkEditor
      readonly
      icon={github.icon.Github}
      kind={'ghost'}
      value={ghIssue.url}
      placeholder={github.string.Issue}
      title={`${repository.name}`}
    />
  </div>
{/if}
