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
  import { Ref, WithLookup } from '@anticrm/core'
  import { getClient } from '@anticrm/presentation'
  import { Icon } from '@anticrm/ui'
  import contact from '@anticrm/contact'
  import ObjectPresenter from '@anticrm/view-resources/src/components/ObjectPresenter.svelte'
  import { Project, ProjectStatus, Team } from '@anticrm/tracker'
  import plugin from '../../plugin'
  import ProjectStatusSelector from './ProjectStatusSelector.svelte'

  export let value: WithLookup<Project>
  export let space: Ref<Team>

  const client = getClient()
  const lead = value.$lookup?.lead

  async function updateStatus(status: ProjectStatus) {
    await client.updateDoc(
      plugin.class.Project,
      space,
      value._id,
      {status}
    )
  }
</script>

<div class="flex-presenter">
  <div class="icon">
    <Icon icon={plugin.icon.Project} size="small" />
  </div>
  <span class="label nowrap project-label">{value.label}</span>
  {#if lead}
    <div class="lead-container">
      <ObjectPresenter
        value={lead}
        objectId={lead._id}
        _class={lead._class}
        props={{shouldShowName: false}}
      />
    </div>
  {:else}
    <div class="lead-placeholder">
      <Icon icon={contact.icon.Person} size="large" />
    </div>
  {/if}
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

  .lead-container {
    padding-bottom: 5px;
    margin-right: 12px;
  }

  .lead-placeholder {
    margin-right: 20px;
  }
</style>
