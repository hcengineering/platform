<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
-->
<script lang="ts">
  import { createQuery, getClient } from '@hcengineering/presentation'

  import { Issue } from '@hcengineering/tracker'
  import { GithubIssue, GithubProject, GithubPullRequest } from '@hcengineering/github'
  import github from '../../plugin'

  export let value: GithubPullRequest

  const client = getClient()
  const spaceQuery = createQuery()
  let currentProject: GithubProject | undefined = undefined

  $: spaceQuery.query(github.mixin.GithubProject, { _id: value.space }, (res) => {
    ;[currentProject] = res
  })

  $: ghIssue = client.getHierarchy().hasMixin(value, github.mixin.GithubIssue)
    ? client.getHierarchy().as<Issue, GithubIssue>(value, github.mixin.GithubIssue)
    : undefined
</script>

{#if value}
  <div class="flex-col">
    <div class="flex-row-center crop-presenter">
      <span class="font-medium mr-2 whitespace-nowrap clear-mins">{value.identifier}</span>
      <span class="overflow-label">
        {currentProject?.name}
      </span>
    </div>
    <span class="overflow-label mt-10px">
      {value.title}
      {#if ghIssue}
        # {ghIssue.githubNumber}
      {/if}
    </span>
  </div>
{/if}
