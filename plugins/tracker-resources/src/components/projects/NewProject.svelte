<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Data, generateId, Ref } from '@anticrm/core'
  import { DatePresenter, EditBox } from '@anticrm/ui'
  import {  Card, getClient, UserBox, UserBoxList } from '@anticrm/presentation'
  import {  IntlString } from '@anticrm/platform'
  import contact from '@anticrm/contact'
  import { Project, ProjectStatus, Team } from '@anticrm/tracker'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ProjectStatusSelector from './ProjectStatusSelector.svelte'

  export let space: Ref<Team>
  const dispatch = createEventDispatcher()
  const client = getClient()

  const object: Data<Project> = {
    label: '' as IntlString,
    description: '',
    status: ProjectStatus.Planned,
    lead: null,
    members: [],
    comments: 0,
    attachments: 0,
    startDate: null,
    targetDate: null,
    documents: 0
  }

  async function onSave(){
    await client.createDoc(plugin.class.Project, space, object, generateId())
  }
</script>

<Card
  label={plugin.string.NewProject}
  okAction={onSave}
  canSave={object.label !== ''}
  okLabel={plugin.string.CreateProject}
  spaceClass={plugin.class.Team}
  spaceLabel={plugin.string.Team}
  spacePlaceholder={plugin.string.SelectTeam}
  bind:space={space}
  on:close={() => dispatch('close')}
>
  <div class="label">
    <EditBox
      bind:value={object.label}
      placeholder={plugin.string.ProjectNamePlaceholder}
      maxWidth="37.5rem"
      kind="large-style"
      focus
    />
  </div>
  <div class="description">
    <EditBox
      bind:value={object.description}
      placeholder={plugin.string.ProjectDescriptionPlaceholder}
      maxWidth="37.5rem"
      kind="editbox"
    />
  </div>
  <div slot="pool" class="flex-row-center text-sm gap-1-5">
    <ProjectStatusSelector
      bind:status={object.status}
      onStatusChange={newStatus => {newStatus !== undefined && (object.status = newStatus)}}
    />
    <UserBox
      _class={contact.class.Employee}
      label={plugin.string.ProjectLead}
      placeholder={plugin.string.AssignTo}
      bind:value={object.lead}
      allowDeselect
      titleDeselect={plugin.string.Unassigned}
    />
    <UserBoxList
      _class={contact.class.Employee}
      bind:items={object.members}
      label={plugin.string.ProjectStatusPlaceholder}
      noItems={plugin.string.ProjectStatusPlaceholder}
    />
    <!-- TODO: add labels after customize IssueNeedsToBeCompletedByThisDate -->
    <DatePresenter
      bind:value={object.startDate}
      labelNull={plugin.string.StartDate}
      editable
    />
    <DatePresenter
      bind:value={object.targetDate}
      labelNull={plugin.string.TargetDate}
      editable
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
