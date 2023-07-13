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
  import { getClient, MessageBox } from '@hcengineering/presentation'
  import { Label, Icon, showPopup, Component } from '@hcengineering/ui'
  import type { DoneStateTemplate, KanbanTemplate, KanbanTemplateSpace, StateTemplate } from '@hcengineering/task'
  import setting from '../../plugin'
  import task from '@hcengineering/task'

  import Folders from './Folders.svelte'
  import Templates from './Templates.svelte'

  let folder: KanbanTemplateSpace | undefined
  let template: KanbanTemplate | undefined

  const client = getClient()

  function deleteState ({ state }: { state: StateTemplate | DoneStateTemplate }) {
    if (template === undefined) {
      return
    }

    showPopup(
      MessageBox,
      {
        label: setting.string.DeleteStatus,
        message: setting.string.DeleteStatusConfirm
      },
      undefined,
      async (result) => {
        if (result && template !== undefined) {
          await client.removeDoc(state._class, template.space, state._id)
        }
      }
    )
  }
  const onDeleteState = (e: any) => deleteState(e.detail)
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={task.icon.ManageTemplates} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.ManageTemplates} /></div>
  </div>
  <div class="ac-body columns hScroll">
    <div class="ac-column">
      <Folders bind:folder />
    </div>
    <div class="ac-column">
      {#if folder !== undefined}
        <Templates {folder} bind:template />
      {/if}
    </div>
    <div class="ac-column max">
      {#if template !== undefined}
        <Component
          is={task.component.KanbanTemplateEditor}
          props={{ kanban: template, folder }}
          on:delete={onDeleteState}
        />
      {/if}
    </div>
  </div>
</div>
