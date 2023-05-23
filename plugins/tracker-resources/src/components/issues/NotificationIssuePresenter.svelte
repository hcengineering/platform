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
  <div class="w-full">
    <div class="flex-presenter overflow-label clear-mins inline-presenter mb-1">
      <span class="font-medium mr-2">{title}</span>
      <span>
        {currentProject?.name}
      </span>
    </div>
    <div class="overflow-label">
      {value.title}
    </div>
  </div>
{/if}
