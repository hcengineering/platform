<script lang="ts">
  import GithubRepositories from './GithubRepositories.svelte'

  import { toIdMap, WithLookup } from '@hcengineering/core'
  import { GithubIntegration } from '@hcengineering/github'
  import { getClient } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/tracker'
  import { Scroller } from '@hcengineering/ui'
  import github from '../plugin'

  export let integrations: WithLookup<GithubIntegration>[] = []
  export let projects: Project[] = []

  const client = getClient()

  $: githubProjects = client.getHierarchy().asIfArray(projects, github.mixin.GithubProject)

  $: integerationsMap = toIdMap(integrations)

  $: orphanProjects = githubProjects.filter((it) => !integerationsMap.has(it.integration))
</script>

{#if integrations.length > 0}
  <Scroller shrink={false}>
    <div class="mt-4 ml-4 mb-4 flex-grow h-90">
      {#each integrations as gi}
        {@const giprj = githubProjects.filter((it) => it.integration === gi._id)}
        <div class="flex flex-col mb-4">
          <!-- svelte-ignore a11y-missing-attribute -->
          <GithubRepositories integration={gi} giProjects={giprj} {projects} {orphanProjects} />
        </div>
      {/each}
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .bordered {
    border: 1px dashed var(--theme-divider-color);
  }
  .repository-card {
    border: 1px solid var(--theme-divider-color);
    border-radius: 8px;
    margin: 0.25rem;
    padding: 1rem;
    // height: 7rem;
  }
  .visibility {
    border: 1px solid var(--theme-divider-color);
    border-radius: 2em;
    padding: 0 7px;
    height: fit-content;
  }
  .lcolor-pin {
    border-radius: 50%;
    width: 12px;
    height: 12px;
    background: var(--theme-divider-color);
  }
</style>
