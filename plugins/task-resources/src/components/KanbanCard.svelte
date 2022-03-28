<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { AttachmentsPresenter } from '@anticrm/attachment-resources'
  import { CommentsPresenter } from '@anticrm/chunter-resources'
  import type { WithLookup } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import { Avatar } from '@anticrm/presentation'
  import type { Issue, TodoItem } from '@anticrm/task'
  import { ActionIcon, Component, IconMoreH, showPopup, Tooltip } from '@anticrm/ui'
  import { ContextMenu } from '@anticrm/view-resources'
  import task from '../plugin'
  import TaskPresenter from './TaskPresenter.svelte'

  export let object: WithLookup<Issue>
  export let draggable: boolean

  const showMenu = (ev?: Event): void => {
    showPopup(ContextMenu, { object }, ev ? (ev.target as HTMLElement) : null)
  }

  $: todoItems = (object.$lookup?.todoItems as TodoItem[]) ?? []
  $: doneTasks = todoItems.filter((it) => it.done)
</script>

<div class="card-container" {draggable} class:draggable on:dragstart on:dragend>
  <div class="flex-between mb-2">
    <div class="flex">
      <TaskPresenter value={object} />
      {#if todoItems.length > 0}
        <Tooltip label={task.string.TodoItems} component={task.component.TodoItemsPopup} props={{ value: object }}>
          <div class="ml-2">
            ( {doneTasks?.length}/ {todoItems.length} )
          </div>
        </Tooltip>
      {/if}
    </div>
    <div class="flex-row-center">
      <div class="mr-2">
        <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
      </div>
      <ActionIcon
        label={task.string.More}
        action={(evt) => {
          showMenu(evt)
        }}
        icon={IconMoreH}
        size={'small'}
      />
    </div>
  </div>
  <div class="caption-color mb-3 lines-limit-4">{object.name}</div>
  <!-- <div class="text-sm lines-limit-2">{object.description}</div> -->
  <div class="flex-between">
    <div class="flex-row-center">
      {#if (object.attachments ?? 0) > 0}
        <div class="step-lr75"><AttachmentsPresenter value={object} /></div>
      {/if}
      {#if (object.comments ?? 0) > 0}
        <div class="step-lr75"><CommentsPresenter value={object} /></div>
      {/if}
    </div>
    <Avatar avatar={object.$lookup?.assignee?.avatar} size={'x-small'} />
  </div>
</div>

<style lang="scss">
  .card-container {
    display: flex;
    flex-direction: column;
    padding: 1rem 1.25rem;
    background-color: rgba(222, 222, 240, 0.06);
    border-radius: 0.75rem;
    user-select: none;

    &.draggable {
      cursor: grab;
    }
  }
</style>
