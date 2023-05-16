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
  import { Milestone, Project } from '@hcengineering/tracker'
  import {
    closePopup,
    closeTooltip,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import { MilestoneViewMode } from '../../utils'
  import EditMilestone from './EditMilestone.svelte'
  import MilestoneBrowser from './MilestoneBrowser.svelte'

  export let currentSpace: Ref<Project>
  export let label: IntlString = tracker.string.Milestones
  export let search: string = ''
  export let mode: MilestoneViewMode = 'all'

  let milestoneId: Ref<Milestone> | undefined
  let milestone: Milestone | undefined

  onDestroy(
    resolvedLocationStore.subscribe(async (loc) => {
      closeTooltip()
      closePopup()

      milestoneId = loc.path[5] as Ref<Milestone>
    })
  )

  const milestoneQuery = createQuery()
  $: if (milestoneId !== undefined) {
    milestoneQuery.query(tracker.class.Milestone, { _id: milestoneId }, (result) => {
      milestone = result.shift()
    })
  } else {
    milestoneQuery.unsubscribe()
    milestone = undefined
  }
</script>

{#if milestone}
  <EditMilestone
    {milestone}
    on:milestone={(evt) => {
      const loc = getCurrentResolvedLocation()
      loc.path[5] = evt.detail
      navigate(loc)
    }}
  />
{:else}
  <MilestoneBrowser {label} query={{ space: currentSpace }} {search} {mode} />
{/if}
