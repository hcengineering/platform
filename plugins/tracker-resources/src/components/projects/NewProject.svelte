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
  import { Card, getClient, SpaceSelector, EmployeeBox, UserBoxList } from '@hcengineering/presentation'
  import { Project, ProjectStatus, Team } from '@hcengineering/tracker'
  import { DatePresenter, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ProjectStatusSelector from './ProjectStatusSelector.svelte'
  import { StyledTextArea } from '@hcengineering/text-editor'

  export let space: Ref<Team>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Project> = {
    label: '' as IntlString,
    description: '',
    icon: tracker.icon.Projects,
    status: ProjectStatus.Backlog,
    lead: null,
    members: [],
    comments: 0,
    attachments: 0,
    startDate: null,
    targetDate: null
  }

  async function onSave () {
    await client.createDoc(tracker.class.Project, space, object)
  }

  const handleProjectStatusChanged = (newProjectStatus: ProjectStatus | undefined) => {
    if (newProjectStatus === undefined) {
      return
    }

    object.status = newProjectStatus
  }
</script>

<Card
  label={tracker.string.NewProject}
  okAction={onSave}
  canSave={object.label !== ''}
  okLabel={tracker.string.CreateProject}
  on:close={() => dispatch('close')}
>
  <svelte:fragment slot="header">
    <SpaceSelector _class={tracker.class.Team} label={tracker.string.Team} bind:space />
  </svelte:fragment>
  <EditBox bind:value={object.label} placeholder={tracker.string.ProjectNamePlaceholder} kind={'large-style'} focus />
  <StyledTextArea
    bind:content={object.description}
    placeholder={tracker.string.ProjectDescriptionPlaceholder}
    emphasized
  />
  <svelte:fragment slot="pool">
    <ProjectStatusSelector selectedProjectStatus={object.status} onProjectStatusChange={handleProjectStatusChanged} />
    <EmployeeBox
      label={tracker.string.ProjectLead}
      placeholder={tracker.string.AssignTo}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
      showNavigate={false}
    />
    <UserBoxList bind:items={object.members} label={tracker.string.ProjectMembersSearchPlaceholder} />
    <!-- TODO: add labels after customize IssueNeedsToBeCompletedByThisDate -->
    <DatePresenter bind:value={object.startDate} labelNull={tracker.string.StartDate} editable />
    <DatePresenter bind:value={object.targetDate} labelNull={tracker.string.TargetDate} editable />
  </svelte:fragment>
</Card>
