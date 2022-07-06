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
  import { DocumentQuery, Ref } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { createQuery } from '@anticrm/presentation'
  import { Project } from '@anticrm/tracker'
  import { closePopup, closeTooltip, location } from '@anticrm/ui'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import { ProjectsViewMode } from '../../utils'
  import EditProject from './EditProject.svelte'
  import ProjectBrowser from './ProjectBrowser.svelte'

  export let label: IntlString = tracker.string.Projects
  export let query: DocumentQuery<Project> = {}
  export let search: string = ''
  export let mode: ProjectsViewMode = 'all'

  let projectId: Ref<Project> | undefined
  let project: Project | undefined

  onDestroy(
    location.subscribe(async (loc) => {
      closeTooltip()
      closePopup()

      projectId = loc.path[5] as Ref<Project>
    })
  )

  const projectQuery = createQuery()
  $: if (projectId !== undefined) {
    console.log('call query for', projectId)
    projectQuery.query(tracker.class.Project, { _id: projectId }, (result) => {
      project = result.shift()
      console.log('recieve result for', projectId, project)
    })
  } else {
    projectQuery.unsubscribe()
    project = undefined
  }
</script>

{#if project}
  <EditProject {project} />
{:else}
  <ProjectBrowser {label} {query} {search} {mode} />
{/if}
