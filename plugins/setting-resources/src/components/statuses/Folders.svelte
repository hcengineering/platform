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
  import { createQuery, hasResource } from '@hcengineering/presentation'
  import { Label, Component } from '@hcengineering/ui'
  import task, { KanbanTemplateSpace } from '@hcengineering/task'
  import setting from '@hcengineering/setting'
  import IconArrowRight from '../icons/ArrowRight.svelte'

  export let folder: KanbanTemplateSpace | undefined
  let folders: KanbanTemplateSpace[] = []
  const query = createQuery()
  $: query.query(task.class.KanbanTemplateSpace, {}, (result) => {
    folders = result
  })

  $: if (folder === undefined && folders.length > 0) {
    folder = folders.filter((f) => hasResource(f.icon))[0]
  }

  function select (item: KanbanTemplateSpace) {
    folder = item
  }
</script>

<div class="flex-between trans-title header mb-3">
  <Label label={setting.string.Folders} />
</div>
<div class="flex-col overflow-y-auto">
  {#each folders as f (f._id)}
    {#if hasResource(f.icon)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="flex-between item" class:selected={f._id === folder?._id} on:click={() => select(f)}>
        <div class="icon flex-no-shrink mr-4">
          <Component is={f.icon} />
        </div>
        <div class="flex-grow flex-col">
          <div class="fs-title overflow-label">
            <Label label={f.name} />
          </div>
          <div class="text-sm content-dark-color overflow-label">
            <Label label={f.description} />
          </div>
        </div>
        {#if f._id === folder?._id}
          <div class="caption-color ml-4"><IconArrowRight size={'small'} /></div>
        {/if}
      </div>
    {/if}
  {/each}
</div>

<style lang="scss">
  .header {
    min-height: 1.75rem;
  }
  .item {
    padding: 1.25rem 1rem 1.25rem 1.25rem;
    background-color: var(--theme-button-default);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.75rem;
    cursor: pointer;

    &:hover {
      background-color: var(--theme-button-hovered);
    }
    &.selected {
      background-color: var(--theme-button-pressed);
      cursor: auto;
    }
  }
  .item + .item {
    margin-top: 0.75rem;
  }

  .icon {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    overflow: hidden;
  }
</style>
