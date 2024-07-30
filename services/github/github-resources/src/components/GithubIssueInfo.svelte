<script lang="ts">
  import { Ref } from '@hcengineering/core'
  import { Icon, Label } from '@hcengineering/ui'
  import { GithubIntegrationRepository } from '@hcengineering/github'
  import github from '../plugin'
  import { integrationRepositories } from './utils'

  export let repository: Ref<GithubIntegrationRepository> | undefined = undefined

  $: repositoryValue = repository != null ? $integrationRepositories.get(repository) : undefined
</script>

<div class="flex-row-center">
  {#if repositoryValue}
    <Label label={github.string.IssueRepositoryTarget} />
    <div class="ml-2 mr-2">
      <Icon icon={github.icon.Github} size={'small'} />
    </div>
    {repositoryValue.name}
  {/if}
</div>
