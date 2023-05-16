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
  import { Card, getClient, SpaceSelector } from '@hcengineering/presentation'
  import { EmployeeBox, UserBoxList } from '@hcengineering/contact-resources'
  import { Milestone, MilestoneStatus, Project } from '@hcengineering/tracker'
  import ui, { DatePresenter, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import MilestoneStatusSelector from './MilestoneStatusSelector.svelte'
  import { StyledTextArea } from '@hcengineering/text-editor'

  export let space: Ref<Project>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Milestone> = {
    label: '' as IntlString,
    description: '',
    status: MilestoneStatus.Planned,
    lead: null,
    members: [],
    comments: 0,
    attachments: 0,
    capacity: 0,
    targetDate: Date.now() + 14 * 24 * 60 * 60 * 1000
  }

  async function onSave () {
    await client.createDoc(tracker.class.Milestone, space, object)
  }

  const handleComponentStatusChanged = (newMilestoneStatus: MilestoneStatus | undefined) => {
    if (newMilestoneStatus === undefined) {
      return
    }

    object.status = newMilestoneStatus
  }
</script>

<Card
  label={tracker.string.NewMilestone}
  okAction={onSave}
  canSave={object.label !== ''}
  okLabel={tracker.string.CreateMilestone}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={tracker.class.Project}
      label={tracker.string.Project}
      kind={'secondary'}
      size={'large'}
      bind:space
    />
  </svelte:fragment>
  <EditBox bind:value={object.label} placeholder={tracker.string.MilestoneNamePlaceholder} kind={'large-style'} focus />
  <StyledTextArea
    bind:content={object.description}
    placeholder={tracker.string.ComponentDescriptionPlaceholder}
    emphasized
  />
  <svelte:fragment slot="pool">
    <MilestoneStatusSelector
      selectedMilestoneStatus={object.status}
      onMilestoneStatusChange={handleComponentStatusChanged}
      kind={'secondary'}
      size={'large'}
    />
    <EmployeeBox
      label={tracker.string.MilestoneLead}
      placeholder={tracker.string.AssignTo}
      kind={'secondary'}
      size={'large'}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
      showNavigate={false}
    />
    <UserBoxList
      bind:items={object.members}
      label={tracker.string.MilestoneMembersSearchPlaceholder}
      kind={'secondary'}
      size={'large'}
    />
    <DatePresenter
      bind:value={object.targetDate}
      editable
      label={tracker.string.TargetDate}
      detail={ui.string.SelectDate}
      kind={'secondary'}
      size={'large'}
    />
  </svelte:fragment>
</Card>
