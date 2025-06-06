<script lang="ts">
  import { Issue } from '@hcengineering/tracker'

  import { getClient } from '@hcengineering/presentation'
  import type { ButtonKind } from '@hcengineering/ui'
  import { HyperlinkEditor } from '@hcengineering/view-resources'
  import github from '../../plugin'
  import { integrationRepositories } from '../utils'

  export let value: Issue
  export let kind: ButtonKind = 'ghost'

  $: ghIssue = getClient().getHierarchy().asIf(value, github.mixin.GithubIssue)

  $: repository = ghIssue?.repository !== undefined ? $integrationRepositories.get(ghIssue?.repository) : undefined
</script>

{#if ghIssue !== undefined && ghIssue.url !== '' && repository !== undefined}
  <HyperlinkEditor
    readonly
    icon={github.icon.Github}
    {kind}
    value={ghIssue.url}
    placeholder={github.string.Issue}
    title={`${repository.name}`}
  />
{/if}
