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
  import { Component, ComponentStatus, Project } from '@hcengineering/tracker'
  import { DatePresenter, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ComponentStatusSelector from './ComponentStatusSelector.svelte'
  import { StyledTextArea } from '@hcengineering/text-editor'

  export let space: Ref<Project>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Component> = {
    label: '' as IntlString,
    description: '',
    status: ComponentStatus.Backlog,
    lead: null,
    members: [],
    comments: 0,
    attachments: 0,
    startDate: null,
    targetDate: null
  }

  async function onSave () {
    await client.createDoc(tracker.class.Component, space, object)
  }

  const handleComponentStatusChanged = (newComponentStatus: ComponentStatus | undefined) => {
    if (newComponentStatus === undefined) {
      return
    }

    object.status = newComponentStatus
  }
</script>

<Card
  label={tracker.string.NewComponent}
  okAction={onSave}
  canSave={object.label !== ''}
  okLabel={tracker.string.CreateComponent}
  on:close={() => dispatch('close')}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={tracker.class.Project}
      label={tracker.string.Project}
      bind:space
      kind={'secondary'}
      size={'large'}
    />
  </svelte:fragment>
  <EditBox bind:value={object.label} placeholder={tracker.string.ComponentNamePlaceholder} kind={'large-style'} focus />
  <StyledTextArea
    bind:content={object.description}
    placeholder={tracker.string.ComponentDescriptionPlaceholder}
    emphasized
  />
  <svelte:fragment slot="pool">
    <ComponentStatusSelector
      selectedComponentStatus={object.status}
      onComponentStatusChange={handleComponentStatusChanged}
      kind={'secondary'}
      size={'large'}
    />
    <EmployeeBox
      label={tracker.string.ComponentLead}
      placeholder={tracker.string.AssignTo}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
      showNavigate={false}
      kind={'secondary'}
      size={'large'}
    />
    <UserBoxList
      bind:items={object.members}
      label={tracker.string.ComponentMembersSearchPlaceholder}
      kind={'secondary'}
      size={'large'}
    />
    <!-- TODO: add labels after customize IssueNeedsToBeCompletedByThisDate -->
    <DatePresenter
      bind:value={object.startDate}
      labelNull={tracker.string.StartDate}
      kind={'secondary'}
      size={'large'}
      editable
    />
    <DatePresenter
      bind:value={object.targetDate}
      labelNull={tracker.string.TargetDate}
      kind={'secondary'}
      size={'large'}
      editable
    />
  </svelte:fragment>
</Card>
