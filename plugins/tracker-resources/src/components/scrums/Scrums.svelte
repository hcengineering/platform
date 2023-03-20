<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createQuery } from '@hcengineering/presentation'
  import { Scrum, ScrumRecord, Project } from '@hcengineering/tracker'
  import { closePopup, closeTooltip, location } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import tracker from '../../plugin'
  import ScrumRecordsView from './ScrumRecordsView.svelte'
  import ScrumsView from './ScrumsView.svelte'

  export let currentSpace: Ref<Project>

  let scrumId: Ref<Scrum> | undefined
  let scrum: Scrum | undefined
  let activeScrumRecord: ScrumRecord | undefined

  const activeRecordQuery = createQuery()
  const scrumQuery = createQuery()

  onDestroy(
    location.subscribe(async (loc) => {
      closeTooltip()
      closePopup()

      scrumId = loc.path[5] as Ref<Scrum>
    })
  )

  $: if (scrumId) {
    scrumQuery.query(tracker.class.Scrum, { _id: scrumId }, (res) => {
      scrum = res.shift()
    })
  } else {
    scrumQuery.unsubscribe()
    scrum = undefined
  }

  $: activeRecordQuery.query(
    tracker.class.ScrumRecord,
    {
      space: currentSpace,
      scrumRecorder: { $exists: true },
      startTs: { $exists: true },
      endTs: { $exists: false }
    },
    (result) => {
      activeScrumRecord = result.shift()
    }
  )
</script>

{#if scrum}
  <ScrumRecordsView {activeScrumRecord} {scrum} />
{:else}
  <ScrumsView {activeScrumRecord} {currentSpace} />
{/if}
