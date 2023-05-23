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
  import core, { Class, Doc, Ref, SortingOrder, TxCUD, WithLookup } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import type { Scrum, ScrumRecord } from '@hcengineering/tracker'
  import { ParentsNavigator, UpDownNavigator } from '@hcengineering/view-resources'
  import { Panel } from '@hcengineering/panel'
  import { Button, closePanel, TabItem, TabList } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { handleRecordingScrum } from '../..'
  import ScrumRecordInfo from './ScrumRecordInfo.svelte'
  import contact from '@hcengineering/contact'
  import ScrumRecordTimeSpend from './ScrumRecordTimeSpend.svelte'
  import ScrumRecordObjects from './ScrumRecordObjects.svelte'
  import { scrumRecordTitleMap, ScrumRecordViewMode } from '../../utils'

  export let _id: Ref<ScrumRecord>
  export let _class: Ref<Class<ScrumRecord>>

  const scrumRecordQuery = createQuery()
  const client = getClient()
  const txQuery = createQuery()

  const modeList: TabItem[] = Object.entries(scrumRecordTitleMap).map(([id, labelIntl]) => ({
    id,
    labelIntl,
    action: () => handleViewModeChanged(id as ScrumRecordViewMode)
  }))

  let scrumRecord: WithLookup<ScrumRecord> | undefined
  let scrum: Scrum | undefined
  let isRecording = false
  let txes: TxCUD<Doc>[] = []

  let mode: ScrumRecordViewMode = 'timeReports'

  const onNavigate = () => closePanel()
  const handleViewModeChanged = (newMode: ScrumRecordViewMode) => {
    if (newMode === undefined || newMode === mode) {
      return
    }

    mode = newMode
  }

  $: _class &&
    _id &&
    scrumRecordQuery.query(
      _class,
      { _id },
      (result) => {
        scrumRecord = result.shift()
      },
      {
        lookup: {
          attachedTo: tracker.class.Scrum,
          scrumRecorder: contact.class.EmployeeAccount
        }
      }
    )
  $: scrum = scrumRecord?.$lookup?.attachedTo

  $: {
    if (scrumRecord?.startTs && !scrumRecord.endTs && scrumRecord.scrumRecorder) {
      isRecording = true
    } else {
      isRecording = false
    }
  }

  $: scrumRecord &&
    txQuery.query(
      core.class.TxCUD,
      {
        modifiedOn: { $gte: scrumRecord.startTs, ...(scrumRecord.endTs ? { $lte: scrumRecord.endTs } : {}) },
        modifiedBy: scrumRecord.scrumRecorder
      },
      (res) => {
        txes = res
      },
      { sort: { modifiedOn: SortingOrder.Ascending } }
    )
</script>

{#if scrumRecord && scrum}
  <Panel object={scrumRecord} isUtils={isRecording} isHeader={false} on:close>
    <svelte:fragment slot="navigator">
      <UpDownNavigator element={scrumRecord} />
      <ParentsNavigator element={scrumRecord} />
    </svelte:fragment>
    <svelte:fragment slot="title">
      <span class="fs-title select-text-i">
        {scrumRecord.label}
      </span>
    </svelte:fragment>
    <svelte:fragment slot="utils">
      {#if isRecording}
        <Button
          kind="transparent"
          showTooltip={{ label: tracker.string.StopRecord }}
          icon={tracker.icon.Stop}
          on:click={() => scrum && handleRecordingScrum(client, scrum, scrumRecord)}
        />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="custom-attributes">
      <ScrumRecordInfo {scrumRecord} {scrum} />
    </svelte:fragment>

    <div class="itemsContainer">
      <div class="flex-row-center">
        <TabList
          items={modeList}
          selected={mode}
          on:select={(result) => {
            if (result.detail !== undefined && result.detail.action) result.detail.action()
          }}
        />
      </div>
    </div>
    {#if mode === 'timeReports'}
      <ScrumRecordTimeSpend {txes} members={scrum.members} {onNavigate} />
    {/if}
    {#if mode === 'objects'}
      <ScrumRecordObjects {txes} {onNavigate} />
    {/if}
  </Panel>
{/if}

<style lang="scss">
  .itemsContainer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 0.75rem 0.65rem 2.25rem;
  }
</style>
