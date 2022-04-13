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
  import { formatName } from '@anticrm/contact'
  import type { WithLookup } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import { Avatar } from '@anticrm/presentation'
  import type { Applicant } from '@anticrm/recruit'
  import task, { TodoItem } from '@anticrm/task'
  import { ActionIcon, Component, IconMoreH, showPanel, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import ApplicationPresenter from './ApplicationPresenter.svelte'

  export let object: WithLookup<Applicant>
  export let dragged: boolean

  function showCandidate() {
    showPanel(view.component.EditDoc, object.attachedTo, object.attachedToClass, 'full')
  }

  $: todoItems = (object.$lookup?.todoItems as TodoItem[]) ?? []
  $: doneTasks = todoItems.filter((it) => it.done)

</script>

<div class="flex-col pt-2 pb-2 pr-4 pl-4">
  <div class="flex-between mb-3">
    <div class="flex-row-center">
      <Avatar avatar={object.$lookup?.attachedTo?.avatar} size={'medium'} />
      <div class="flex-grow flex-col min-w-0 ml-2">
        <div class="fs-title over-underline lines-limit-2" on:click={showCandidate}>
          {formatName(object.$lookup?.attachedTo?.name ?? '')}
        </div>
        <div class="text-sm lines-limit-2">{object.$lookup?.attachedTo?.title ?? ''}</div>
      </div>
    </div>
    <div class="tool mr-1 flex-row-center">
      {#if !dragged}
        <div class="mr-2">
          <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
        </div>
        <ActionIcon label={undefined} icon={IconMoreH} size={'small'} />
      {/if}
    </div>
  </div>
  <div class="flex-between">
    <div class="flex-row-center">
      <div class="sm-tool-icon step-lr75">
        <ApplicationPresenter value={object} />
        {#if todoItems.length > 0}
          <Tooltip label={task.string.TodoItems} component={task.component.TodoItemsPopup} props={{ value: object }}>
            <div class="ml-2">( {doneTasks?.length}/ {todoItems.length} )</div>
          </Tooltip>
        {/if}
      </div>
      {#if (object.attachments ?? 0) > 0}
        <div class="step-lr75">
          <AttachmentsPresenter value={object} />
        </div>
      {/if}
      {#if (object.comments ?? 0) > 0}
        <div class="step-lr75">
          <CommentsPresenter value={object} />
        </div>
      {/if}
    </div>
    <Avatar avatar={object.$lookup?.assignee?.avatar} size={'x-small'} />
  </div>
</div>
