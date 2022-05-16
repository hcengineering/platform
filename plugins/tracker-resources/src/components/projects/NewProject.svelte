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
  import contact from '@anticrm/contact'
  import { Data, Ref } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { Card, getClient, SpaceSelector, UserBox, UserBoxList } from '@anticrm/presentation'
  import { Project, ProjectStatus, Team } from '@anticrm/tracker'
  import { DatePresenter, EditBox } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import ProjectStatusSelector from './ProjectStatusSelector.svelte'

  export let space: Ref<Team>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Project> = {
    label: '' as IntlString,
    description: '',
    icon: tracker.icon.Projects,
    status: ProjectStatus.Planned,
    lead: null,
    members: [],
    comments: 0,
    attachments: 0,
    startDate: null,
    targetDate: null,
    documents: 0
  }

  async function onSave () {
    await client.createDoc(tracker.class.Project, space, object)
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
    <ProjectStatusSelector
      bind:status={object.status}
      onStatusChange={(newStatus) => {
        newStatus !== undefined && (object.status = newStatus)
      }}
    />
    <UserBox
      _class={contact.class.Employee}
      label={tracker.string.ProjectLead}
      placeholder={tracker.string.AssignTo}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={tracker.string.Unassigned}
    />
    <UserBoxList
      _class={contact.class.Employee}
      bind:items={object.members}
      label={tracker.string.ProjectStatusPlaceholder}
    />
    <!-- TODO: add labels after customize IssueNeedsToBeCompletedByThisDate -->
    <DatePresenter bind:value={object.startDate} labelNull={tracker.string.StartDate} editable />
    <DatePresenter bind:value={object.targetDate} labelNull={tracker.string.TargetDate} editable />
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
