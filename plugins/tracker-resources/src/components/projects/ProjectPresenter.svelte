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
  import { Ref } from '@anticrm/core'
  import { Avatar, getClient } from '@anticrm/presentation'
  import { Icon } from '@anticrm/ui'
  import contact from '@anticrm/contact'
  import { Project, ProjectStatus, Team } from '@anticrm/tracker'
  import plugin from '../../plugin'
  import ProjectStatusSelector from './ProjectStatusSelector.svelte'

  export let value: Project
  export let space: Ref<Team>

  const client = getClient()

  async function getLeadAvatar() {
    if (!value.lead) {
      return null
    }

    const lead = await client.findOne(
      contact.class.Employee,
      {_id: value.lead}
    )

    return lead?.avatar
  }

  async function updateStatus(status: ProjectStatus) {
    await client.updateDoc(
      plugin.class.Project,
      space,
      value._id,
      {status}
    )
  }
</script>

<div class="flex-presenter" on:click={console.log}>
  <div class="icon">
    <Icon icon={plugin.icon.Project} size="small" />
  </div>
  <span class="label nowrap project-label">{value.label}</span>
  <div class="icon lead">
    {#await getLeadAvatar() then avatar}
      {#if avatar}
        <Avatar avatar={avatar} size="small"/>
      {:else}
        <Icon icon={contact.icon.Person} size="small" />
      {/if}
    {/await}
  </div>
  <div class="icon">
    <ProjectStatusSelector
      kind="icon"
      shouldShowLabel={false}
      status={value.status}
      onStatusChange={status => status !== undefined && updateStatus(status)}
    />
  </div>
</div>

<style>
  .project-label {
    width: 250px;
  }

  .lead {
    width: 35px;
  }
</style>
