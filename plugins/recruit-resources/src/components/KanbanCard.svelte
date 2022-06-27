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
  import contact, { formatName } from '@anticrm/contact'
  import type { WithLookup } from '@anticrm/core'
  import notification from '@anticrm/notification'
  import { Avatar } from '@anticrm/presentation'
  import type { Applicant, Candidate } from '@anticrm/recruit'
  import task, { TodoItem } from '@anticrm/task'
  import { AssigneePresenter } from '@anticrm/task-resources'
  import { Component, showPanel, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import ApplicationPresenter from './ApplicationPresenter.svelte'

  export let object: WithLookup<Applicant>
  export let dragged: boolean

  function showCandidate () {
    showPanel(view.component.EditDoc, object._id, object._class, 'content')
  }

  $: todoItems = (object.$lookup?.todoItems as TodoItem[]) ?? []
  $: doneTasks = todoItems.filter((it) => it.done)

  $: channels = (object.$lookup?.attachedTo as WithLookup<Candidate>)?.$lookup?.channels
</script>

<div class="flex-col pt-2 pb-2 pr-4 pl-4 cursor-pointer" on:click={showCandidate}>
  <div class="flex-between mb-3">
    <div class="flex-row-center">
      <Avatar avatar={object.$lookup?.attachedTo?.avatar} size={'medium'} />
      <div class="flex-grow flex-col min-w-0 ml-2">
        <div class="fs-title over-underline lines-limit-2">
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
      {/if}
    </div>
    {#if channels && channels.length > 0}
      <div class="tool mr-1 flex-row-center">
        <div class="step-lr75">
          <Component
            is={contact.component.ChannelsPresenter}
            props={{ value: channels, object: object.$lookup?.attachedTo, length: 'tiny' }}
          />
        </div>
      </div>
    {/if}
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
          <AttachmentsPresenter value={object.attachments} {object} />
        </div>
      {/if}
      {#if (object.comments ?? 0) > 0}
        <div class="step-lr75">
          <CommentsPresenter value={object.comments} {object} />
        </div>
      {/if}
    </div>
    <AssigneePresenter
      value={object.$lookup?.assignee}
      issueId={object._id}
      defaultClass={contact.class.Employee}
      currentSpace={object.space}
    />
  </div>
</div>
