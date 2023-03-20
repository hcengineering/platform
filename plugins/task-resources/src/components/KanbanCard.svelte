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
  import { AttachmentsPresenter } from '@hcengineering/attachment-resources'
  import { CommentsPresenter } from '@hcengineering/chunter-resources'
  import type { WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { Avatar } from '@hcengineering/contact-resources'
  import type { Issue, TodoItem } from '@hcengineering/task'
  import { ActionIcon, Component, IconMoreH, showPopup, tooltip } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import task from '../plugin'
  import TaskPresenter from './TaskPresenter.svelte'

  export let object: WithLookup<Issue>

  const showMenu = (ev?: Event): void => {
    showPopup(ContextMenu, { object }, ev ? (ev.target as HTMLElement) : null)
  }

  $: todoItems = (object.$lookup?.todoItems as TodoItem[]) ?? []
  $: doneTasks = todoItems.filter((it) => it.done)
</script>

<div class="flex-col pt-2 pb-2 pr-4 pl-4">
  <div class="flex-between mb-2">
    <div class="flex">
      <TaskPresenter value={object} />
      {#if todoItems.length > 0}
        <span
          class="ml-2"
          use:tooltip={{
            label: task.string.TodoItems,
            component: task.component.TodoItemsPopup,
            props: { value: object }
          }}
        >
          ({doneTasks?.length}/{todoItems.length})
        </span>
      {/if}
    </div>
    <div class="flex-row-center">
      <div class="mr-2">
        <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
      </div>
      <ActionIcon label={task.string.More} action={showMenu} icon={IconMoreH} size={'small'} />
    </div>
  </div>
  <div class="caption-color mb-3 lines-limit-4">{object.name}</div>
  <!-- <div class="text-sm lines-limit-2">{object.description}</div> -->
  <div class="flex-between">
    <div class="flex-row-center">
      {#if (object.attachments ?? 0) > 0}
        <div class="step-lr75">
          <AttachmentsPresenter value={object.attachments} {object} />
        </div>
      {/if}
      {#if (object.comments ?? 0) > 0}
        <div class="step-lr75">
          <CommentsPresenter value={object.comments} {object} />
        </div>
      {/if}
    </div>
    <Avatar avatar={object.$lookup?.assignee?.avatar} size={'x-small'} />
  </div>
</div>
