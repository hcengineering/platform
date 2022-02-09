<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  // import type { Ref, Space, Doc, Class } from '@anticrm/core'
  import { getClient, MessageBox } from '@anticrm/presentation'
  import { Label, Icon, showPopup, Component } from '@anticrm/ui'
  import type { KanbanTemplate, KanbanTemplateSpace, StateTemplate } from '@anticrm/task'
  import setting from '@anticrm/setting'
  import task from '@anticrm/task'

  import Folders from './Folders.svelte'
  import Templates from './Templates.svelte'

  // export let objectId: Ref<Doc>
  // export let space: Ref<Space>
  // export let _class: Ref<Class<Doc>>

  let folder: KanbanTemplateSpace | undefined
  let template: KanbanTemplate | undefined

  const client = getClient()

  function deleteState ({ state }: { state: StateTemplate }) {
    if (template === undefined) {
      return
    }

    showPopup(MessageBox, {
      label: 'Delete status',
      message: 'Do you want to delete this status?'
    }, undefined, async (result) => {
      if (result && template !== undefined) {
        await client.updateDoc(template._class, template.space, template._id, { $pull: { states: state._id } })
        await client.removeCollection(state._class, template.space, state._id, template._id, template._class, 'statesC')
      }
    })
  }
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={task.icon.ManageStatuses} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.ManageStatuses}/></div>
  </div>
  <div class="ac-body columns hScroll">
    <div class="ac-column">
      <Folders bind:folder={folder}/>
    </div>
    <div class="ac-column">
      {#if folder !== undefined}
        <Templates {folder} bind:template={template}/>
      {/if}
    </div>
    <div class="ac-column max">
      {#if template !== undefined}
        <Component is={task.component.KanbanTemplateEditor} props={{ kanban: template }} on:delete={(e) => deleteState(e.detail)}/>
      {/if}
    </div>
  </div>
</div>
