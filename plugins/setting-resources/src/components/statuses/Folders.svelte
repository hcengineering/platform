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
  import { createQuery } from '@anticrm/presentation'
  import { Label, Component } from '@anticrm/ui'
  import task, { KanbanTemplateSpace } from '@anticrm/task'
  import setting from '@anticrm/setting'


  export let folder: KanbanTemplateSpace | undefined
  let folders: KanbanTemplateSpace[] = []
  const query = createQuery()
  $: query.query(task.class.KanbanTemplateSpace, {}, (result) => { folders = result })

  $: if (folder === undefined && folders.length > 0) {
    folder = folders[0]
  }

  function select (item: KanbanTemplateSpace) {
    folder = item
  }
</script>

<div class="root flex-col w-full">
  <div class="header">
    <Label label={setting.string.Folders}/>
  </div>
  <div class="content">
    {#each folders as f (f._id)}
      <div class="item" class:selected={f._id === folder?._id} on:click={() => select(f)}>
        <div class="item-icon">
          <Component is={f.icon}/>
        </div>
        <div class="item-content">
          <div class="item-name">
            {f.name}
          </div>
          <div class="item-description">
            {f.description}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .root {
    gap: 1rem;
  }

  .header {
    display: flex;
    align-items: center;

    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-content-trans-color);
    font-size: 0.75rem;
    height: 1.75rem;
  }

  .content {
    display: flex; 
    flex-direction: column;
    
    overflow-y: auto;
  }

  .item {
    display: flex;
    padding: 20px;

    cursor: pointer;

    &:hover, &.selected {
      background-color: var(--theme-button-bg-enabled);
      border-radius: 12px;
    }
  }

  .item-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;

    margin-right: 1rem;
  }

  .item-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .item-name {
    color: var(--theme-caption-color);
    font-size: 1rem;
    font-weight: 500;
  }

  .item-description {
    color: var(--theme-content-dark-color);
  }
</style>
