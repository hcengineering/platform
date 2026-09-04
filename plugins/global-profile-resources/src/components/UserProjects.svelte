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
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { onMount } from "svelte"
  import { getClient } from "@hcengineering/presentation"
  import { type Project } from "@hcengineering/task"
  import task from "@hcengineering/task"
  import contact from "@hcengineering/contact"
  import { Loading, Label } from "@hcengineering/ui"
  import type { AccountUuid, PersonUuid } from "@hcengineering/core"
  import globalProfile from "@hcengineering/global-profile"

  export let userId: string

  let projects: Project[] = []
  let loading: boolean = true
  let error: string | null = null

  onMount(async () => {
    try {
      const client = getClient()
      if (client == null || !client.findAll) {
        error = 'No active workspace'
        loading = false
        return
      }
      // Resolve AccountUuid from PersonUuid via Employee record
      const employee = await client.findOne(contact.mixin.Employee, { personUuid: userId as AccountUuid })
      const accountUuid: AccountUuid = (employee?.personUuid ?? userId) as AccountUuid
      const result = await client.findAll(task.class.Project, { members: accountUuid })
      projects = Array.isArray(result) ? result : []
    } catch (e) {
      error = String(e)
    } finally {
      loading = false
    }
  })
</script>

<div class="user-projects-section">
  <div class="section-title">
    <Label label={globalProfile.string.Projects} />
  </div>

  {#if loading}
    <Loading />
  {:else if error != null}
    <div class="error-message">
      {error}
    </div>
  {:else if projects.length === 0}
    <div class="empty-state">
      <Label label={globalProfile.string.NoProjects} />
    </div>
  {:else}
    <div class="projects-grid">
      {#each projects as project}
        <div class="project-card">
          <div class="project-name">{project.name}</div>
          <div class="project-description">{project.description || ""}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .user-projects-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--theme-divider-color);
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--theme-caption-color);
    margin-bottom: 1rem;
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: 0.75rem;
  }

  .project-card {
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: var(--theme-button-hovered);
    }
  }

  .project-name {
    font-weight: 500;
    color: var(--theme-caption-color);
    font-size: 1rem;
  }

  .project-description {
    color: var(--theme-content-color);
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-state {
    color: var(--theme-text-placeholder-color);
    font-style: italic;
    padding: 1rem 0;
  }

  .error-message {
    color: var(--theme-error-color);
    font-size: 0.875rem;
    padding: 1rem 0;
  }
</style>