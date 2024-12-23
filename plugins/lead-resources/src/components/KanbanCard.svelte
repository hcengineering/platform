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
  import { AttachmentsPresenter } from '@hcengineering/attachment-resources'
  import { ChatMessagesPresenter } from '@hcengineering/chunter-resources'
  import contact from '@hcengineering/contact'
  import { ContactPresenter } from '@hcengineering/contact-resources'
  import type { WithLookup } from '@hcengineering/core'
  import type { Lead } from '@hcengineering/lead'
  import notification from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import task from '@hcengineering/task'
  import { AssigneePresenter, StateRefPresenter } from '@hcengineering/task-resources'
  import { ActionIcon, Component, DueDatePresenter, IconMoreH } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { enabledConfig, openDoc, showMenu, statusStore } from '@hcengineering/view-resources'
  import tracker from '@hcengineering/tracker'

  import lead from '../plugin'
  import LeadPresenter from './LeadPresenter.svelte'

  export let object: WithLookup<Lead>
  export let config: (string | BuildModelKey)[]
  export let groupByKey: string

  const assigneeAttribute = getClient().getHierarchy().getAttribute(lead.class.Lead, 'assignee')

  function showLead () {
    openDoc(getClient().getHierarchy(), object)
  }

  $: status = $statusStore.byId.get(object.status)

  $: isDone = status?.category === task.statusCategory.Lost || status?.category === task.statusCategory.Won
</script>

<div class="flex-col pt-3 pb-3 pr-4 pl-4">
  <div class="flex-between mb-3">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="fs-title cursor-pointer" on:click={showLead}>{object.title}</div>
    <div class="flex-row-center">
      <div class="mr-2">
        <Component is={notification.component.NotificationPresenter} props={{ value: object }} />
      </div>
      <ActionIcon
        label={lead.string.More}
        action={(evt) => {
          showMenu(evt, { object })
        }}
        icon={IconMoreH}
        size={'small'}
      />
    </div>
  </div>
  <div class="flex-between mb-2">
    {#if enabledConfig(config, 'attachedTo') && object.$lookup?.attachedTo}
      <ContactPresenter value={object.$lookup.attachedTo} avatarSize={'small'} />
    {/if}
  </div>
  <div class="card-labels mb-2">
    {#if groupByKey !== 'status' && enabledConfig(config, 'status')}
      <StateRefPresenter
        size={'small'}
        kind={'link-bordered'}
        space={object.space}
        shrink={1}
        value={object.status}
        onChange={(status) => {
          client.update(object, { status })
        }}
      />
    {/if}
    <Component showLoading={false} is={tracker.component.RelatedIssueSelector} props={{ object, size: 'small' }} />
    {#if enabledConfig(config, 'dueDate')}
      <DueDatePresenter
        size={'small'}
        kind={'link-bordered'}
        width={'fit-content'}
        value={object.dueDate}
        shouldRender={object.dueDate !== null && object.dueDate !== undefined}
        shouldIgnoreOverdue={isDone}
        onChange={async (e) => {
          await client.update(object, { dueDate: e })
        }}
      />
    {/if}
  </div>
  <div class="flex-between">
    <div class="flex-row-center gap-3 reverse mr-4">
      <LeadPresenter value={object} />
      {#if enabledConfig(config, 'attachments') && (object.attachments ?? 0) > 0}
        <AttachmentsPresenter value={object.attachments} {object} />
      {/if}
      {#if enabledConfig(config, 'comments')}
        <ChatMessagesPresenter value={object.comments} {object} />
      {/if}
    </div>
    {#if enabledConfig(config, 'assignee')}
      <AssigneePresenter
        value={object.assignee}
        issueId={object._id}
        defaultClass={contact.mixin.Employee}
        currentSpace={object.space}
        placeholderLabel={assigneeAttribute.label}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .card-labels {
    display: flex;
    flex-wrap: nowrap;
    min-width: 0;

    &.labels {
      overflow: hidden;
      flex-shrink: 1;
      border-radius: 0.5rem;
    }
  }
</style>
