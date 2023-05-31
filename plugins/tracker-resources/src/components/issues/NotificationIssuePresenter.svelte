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
  import { createQuery } from '@hcengineering/presentation'
  import type { Issue, Project } from '@hcengineering/tracker'
  import tracker from '../../plugin'

  export let value: Issue

  const spaceQuery = createQuery()
  let currentProject: Project | undefined = undefined

  $: spaceQuery.query(tracker.class.Project, { _id: value.space }, (res) => ([currentProject] = res))

  $: title = currentProject ? `${currentProject.identifier}-${value?.number}` : `${value?.number}`
</script>

{#if value}
  <div class="flex-col">
    <div class="flex-row-center crop-presenter">
      <span class="font-medium mr-2 whitespace-nowrap clear-mins">{title}</span>
      <span class="overflow-label">
        {currentProject?.name}
      </span>
    </div>
    <span class="overflow-label mt-10px">
      {value.title}
    </span>
  </div>
{/if}
