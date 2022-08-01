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
  import { Data, Ref } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { Card, EmployeeBox, getClient, SpaceSelector } from '@anticrm/presentation'
  import { Sprint, SprintStatus, Team } from '@anticrm/tracker'
  import ui, { DatePresenter, EditBox } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import SprintStatusSelector from './SprintStatusSelector.svelte'

  export let space: Ref<Team>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Sprint> = {
    label: '' as IntlString,
    description: '',
    status: SprintStatus.Planned,
    lead: null,
    comments: 0,
    attachments: 0,
    startDate: Date.now(),
    targetDate: Date.now() + 14 * 24 * 60 * 60 * 1000
  }

  async function onSave () {
    await client.createDoc(tracker.class.Sprint, space, object)
  }

  const handleProjectStatusChanged = (newSprintStatus: SprintStatus | undefined) => {
    if (newSprintStatus === undefined) {
      return
    }

    object.status = newSprintStatus
  }
</script>

<Card
  label={tracker.string.NewSprint}
  okAction={onSave}
  canSave={object.label !== ''}
  okLabel={tracker.string.CreateSprint}
  on:close={() => dispatch('close')}
>
  <svelte:fragment slot="header">
    <SpaceSelector _class={tracker.class.Team} label={tracker.string.Team} bind:space />
  </svelte:fragment>
  <div class="label">
    <EditBox
      bind:value={object.label}
      placeholder={tracker.string.ProjectNamePlaceholder}
      maxWidth="37.5rem"
      kind="large-style"
      focus
    />
  </div>
  <div class="description">
    <EditBox
      bind:value={object.description}
      placeholder={tracker.string.ProjectDescriptionPlaceholder}
      maxWidth="37.5rem"
      kind="editbox"
    />
  </div>
  <div slot="pool" class="flex-row-center text-sm gap-1-5">
    <SprintStatusSelector selectedSprintStatus={object.status} onSprintStatusChange={handleProjectStatusChanged} />
    <EmployeeBox
      label={tracker.string.ProjectLead}
      placeholder={tracker.string.AssignTo}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
    />
    <DatePresenter
      bind:value={object.startDate}
      editable
      label={tracker.string.StartDate}
      detail={ui.string.SelectDate}
    />
    <DatePresenter
      bind:value={object.targetDate}
      editable
      label={tracker.string.TargetDate}
      detail={ui.string.SelectDate}
    />
  </div>
</Card>

<style>
  .label {
    margin-bottom: 10px;
  }
  .description {
    margin-bottom: 10px;
  }
</style>
