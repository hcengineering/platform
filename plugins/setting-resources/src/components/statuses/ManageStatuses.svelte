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
  import type { Ref, Space, Doc, Class, State } from '@anticrm/core'
  import { getClient, MessageBox } from '@anticrm/presentation'
  import { Label, Icon, showPopup } from '@anticrm/ui'
  import type { BaseKanban, KanbanTemplate, KanbanTemplateSpace } from '@anticrm/view'
  import { KanbanEditor } from '@anticrm/view-resources'
  import setting from '@anticrm/setting'

  import Folders from './Folders.svelte'
  import Templates from './Templates.svelte'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let folder: KanbanTemplateSpace | undefined
  let template: KanbanTemplate | undefined

  const client = getClient()

  function deleteState ({ kanban, state }: { kanban: BaseKanban, state: State }) {
    showPopup(MessageBox, {
        label: 'Delete status',
        message: 'Do you want to delete this status?'
      }, undefined, async (result) => {
        if (result) {
          await client.updateDoc(kanban._class, kanban.space, kanban._id, { $pull: { states: state._id }})
          await client.removeDoc(state._class, state.space, state._id)
        }
      })
  }
</script>

<div class="root">
  <div class="header">
    <Icon icon={setting.icon.Statuses} size="large"/>
    <Label label={setting.string.ManageStatuses}/>
  </div>
  <div class="content">
    <div class="folders flex-stretch">
      <Folders bind:folder={folder}/>
    </div>
    <div class="templates flex-stretch">
      {#if folder !== undefined}
        <Templates {folder} bind:template={template}/>
      {/if}
    </div>
    <div class="statuses flex-stretch">
      {#if template !== undefined}
        <KanbanEditor kanban={template} on:delete={(e) => deleteState(e.detail)}/>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;

    padding: 24px 42px;
    border-bottom: 1px solid var(--theme-bg-accent-hover);

    font-size: 1rem;
    font-weight: 500;
    color: var(--theme-caption-color);
  }

  .content {
    display: flex;
    align-items: stretch;
    height: 100%;
    width: 100%;
    overflow: auto;
  }

  .folders {
    width: 380px;
    padding: 2rem 2.5rem 1rem;
    flex-shrink: 0;
    flex-grow: 0;
    border-right: 1px solid var(--theme-bg-accent-hover);
  }

  .templates {
    width: 380px;
    padding: 2rem 2.5rem 1rem;
    flex-shrink: 0;
    flex-grow: 0;
    border-right: 1px solid var(--theme-bg-accent-hover);
  }

  .statuses {
    width: 100%;
    padding: 2rem 2.5rem 1rem;
    flex-grow: 1;
  }
</style>
