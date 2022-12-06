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
  import { Data, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Card, EmployeeBox, getClient, SpaceSelector, UserBoxList } from '@hcengineering/presentation'
  import { Project, Sprint, SprintStatus, Team } from '@hcengineering/tracker'
  import ui, { DatePresenter, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ProjectSelector from '../ProjectSelector.svelte'
  import SprintStatusSelector from './SprintStatusSelector.svelte'
  import { StyledTextArea } from '@hcengineering/text-editor'

  export let space: Ref<Team>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Sprint> = {
    label: '' as IntlString,
    description: '',
    status: SprintStatus.Planned,
    lead: null,
    members: [],
    comments: 0,
    attachments: 0,
    capacity: 0,
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

  const handleProjectIdChanged = async (projectId: Ref<Project> | null | undefined) => {
    if (projectId === undefined) {
      return
    }

    object.project = projectId ?? undefined
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
  <EditBox bind:value={object.label} placeholder={tracker.string.SprintNamePlaceholder} kind={'large-style'} focus />
  <StyledTextArea
    bind:content={object.description}
    placeholder={tracker.string.ProjectDescriptionPlaceholder}
    emphasized
  />
  <svelte:fragment slot="pool">
    <SprintStatusSelector selectedSprintStatus={object.status} onSprintStatusChange={handleProjectStatusChanged} />
    <ProjectSelector value={object.project} onChange={handleProjectIdChanged} />
    <EmployeeBox
      label={tracker.string.SprintLead}
      placeholder={tracker.string.AssignTo}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
      showNavigate={false}
    />
    <UserBoxList bind:items={object.members} label={tracker.string.SprintMembersSearchPlaceholder} />
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
  </svelte:fragment>
</Card>

<style>
  .label {
    margin-bottom: 10px;
  }
  .description {
    margin-bottom: 10px;
  }
</style>
