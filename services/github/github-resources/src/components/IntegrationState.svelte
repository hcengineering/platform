<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { AttachedDoc, WithLookup } from '@hcengineering/core'
  import { GithubIntegration, GithubIntegrationRepository } from '@hcengineering/github'
  import { getClient } from '@hcengineering/presentation'
  import type { Integration } from '@hcengineering/account-client'
  import { BaseIntegrationState } from '@hcengineering/setting-resources'
  import { OK, ERROR, Status } from '@hcengineering/platform'

  import github from '../plugin'
  import RepositoryPresenterRef from './RepositoryPresenterRef.svelte'

  export let integration: Integration

  let githubIntegration: WithLookup<GithubIntegration> | undefined
  let status: Status | undefined
  let isLoading = true

  const asRepos = (docs: AttachedDoc[]) => docs as GithubIntegrationRepository[]

  const client = getClient()
  $: loadIntegration(integration)

  async function loadIntegration (integration: Integration): Promise<void> {
    try {
      const installationId = integration?.data?.installationId ?? []
      const installations = Array.isArray(installationId) ? installationId : [installationId]
      githubIntegration = await client.findOne(
        github.class.GithubIntegration,
        {
          installationId: { $in: installations }
        },
        {
          lookup: {
            _id: {
              repositories: github.class.GithubIntegrationRepository
            }
          }
        }
      )
      status = OK
    } catch (err: any) {
      console.error('Error loading github state:', err)
      status = ERROR
    } finally {
      isLoading = false
    }
  }
</script>

<BaseIntegrationState {integration} {status} {isLoading} value={githubIntegration?.name}>
  <svelte:fragment slot="content">
    {#if githubIntegration !== undefined}
      <div class="space-divider bottom" />
      {#if githubIntegration.$lookup?.repositories != null}
        {#each asRepos(githubIntegration.$lookup?.repositories) as repository}
          <div class="stat-row">
            <RepositoryPresenterRef value={repository._id} />
          </div>
        {/each}
      {/if}
    {/if}
  </svelte:fragment>
</BaseIntegrationState>

<style lang="scss">
  .stat-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    padding: 0.15rem 0;
  }
</style>
