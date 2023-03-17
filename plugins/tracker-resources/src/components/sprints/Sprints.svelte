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
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Sprint, Project } from '@hcengineering/tracker'
  import { closePopup, closeTooltip, getCurrentLocation, location, navigate } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import { SprintViewMode } from '../../utils'
  import EditSprint from './EditSprint.svelte'
  import SprintBrowser from './SprintBrowser.svelte'

  export let currentSpace: Ref<Project>
  export let label: IntlString = tracker.string.Sprints
  export let search: string = ''
  export let mode: SprintViewMode = 'all'

  let sprintId: Ref<Sprint> | undefined
  let sprint: Sprint | undefined

  onDestroy(
    location.subscribe(async (loc) => {
      closeTooltip()
      closePopup()

      sprintId = loc.path[5] as Ref<Sprint>
    })
  )

  const sprintQuery = createQuery()
  $: if (sprintId !== undefined) {
    sprintQuery.query(tracker.class.Sprint, { _id: sprintId }, (result) => {
      sprint = result.shift()
    })
  } else {
    sprintQuery.unsubscribe()
    sprint = undefined
  }
</script>

{#if sprint}
  <EditSprint
    {sprint}
    on:sprint={(evt) => {
      const loc = getCurrentLocation()
      loc.path[5] = evt.detail
      navigate(loc)
    }}
  />
{:else}
  <SprintBrowser {label} query={{ space: currentSpace }} {search} {mode} />
{/if}
