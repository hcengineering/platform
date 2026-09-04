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
  import tracker from "@hcengineering/tracker"
  import { Loading, Label } from "@hcengineering/ui"
  import type { AccountUuid } from "@hcengineering/core"
  import globalProfile from "@hcengineering/global-profile"

  export let userId: string

  interface StatItem {
    label: string
    count: number
  }

  let stats: StatItem[] = []
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
      const [allIssues, userProjects] = await Promise.all([
        client.findAll(tracker.class.Issue, {}),
        client.findAll(task.class.Project, { members: userId as AccountUuid })
      ])
      const projects = Array.isArray(userProjects) ? userProjects : []

      stats = [
        { label: "Total Issues", count: allIssues.length },
        { label: "Projects", count: projects.length }
      ]
    } catch (e) {
      error = String(e)
    } finally {
      loading = false
    }
  })
</script>

<div class="user-stats-section">
  <div class="section-title">
    <Label label={globalProfile.string.Stats} />
  </div>

  {#if loading}
    <Loading />
  {:else if error != null}
    <div class="error-message">
      {error}
    </div>
  {:else if stats.length === 0}
    <div class="empty-state">
      <Label label={globalProfile.string.NoStats} />
    </div>
  {:else}
    <div class="stats-grid">
      {#each stats as stat}
        <div class="stat-card">
          <div class="stat-count">{stat.count}</div>
          <div class="stat-label">{stat.label}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .user-stats-section {
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-count {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--theme-caption-color);
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--theme-content-color);
    text-align: center;
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