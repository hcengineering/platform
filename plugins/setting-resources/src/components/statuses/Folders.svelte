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

<div class="flex-between trans-title mb-3">
  <Label label={setting.string.Folders}/>
</div>
<div class="flex-col overflow-y-auto">
  {#each folders as f (f._id)}
    <div class="flex-row-center item" class:selected={f._id === folder?._id} on:click={() => select(f)}>
      <div class="icon mr-4">
        <Component is={f.icon}/>
      </div>
      <div class="flex-grow flex-col">
        <div class="fs-title overflow-label">
          {f.name}
        </div>
        <div class="small-text content-dark-color overflow-label">
          {f.description}
        </div>
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .item {
    padding: 1.75rem;
    border: 1px solid transparent;
    border-radius: .75rem;
    cursor: pointer;

    &:hover { background-color: var(--theme-bg-accent-color); }
    &.selected {
      background-color: var(--theme-button-bg-enabled);
      border-color: var(--theme-bg-accent-color);
      cursor: auto;
    }
  }
  .item + .item { margin-top: .75rem; }

  .icon {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    overflow: hidden;
  }
</style>
