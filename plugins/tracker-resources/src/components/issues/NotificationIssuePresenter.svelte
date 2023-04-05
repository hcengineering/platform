<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { createQuery, statusStore } from '@hcengineering/presentation'
  import type { Issue, Project } from '@hcengineering/tracker'
  import { Icon } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let value: Issue

  const spaceQuery = createQuery()
  let currentProject: Project | undefined = undefined

  spaceQuery.query(tracker.class.Project, { _id: value.space }, (res) => ([currentProject] = res))

  $: title = currentProject ? `${currentProject.identifier}-${value?.number}` : `${value?.number}`
  $: status = $statusStore.byId.get(value.status)
</script>

{#if value}
  <div class="flex-between">
    <div class="flex-center">
      {#if currentProject}
        {#if currentProject.icon}
          <Icon icon={currentProject.icon ?? tracker.icon.Home} size="inline" />
        {/if}
        <div class="ml-1 mr-1">
          {currentProject.name}
        </div>
      {/if}
      {title}
      {value.title}
    </div>
    <div>
      {#if status}
        <IssueStatusIcon value={status} size="small" />
      {/if}
    </div>
  </div>
{/if}
