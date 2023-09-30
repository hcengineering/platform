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
  import { CommentsPresenter } from '@hcengineering/chunter-resources'
  import contact from '@hcengineering/contact'
  import { ContactPresenter } from '@hcengineering/contact-resources'
  import type { WithLookup } from '@hcengineering/core'
  import type { Lead } from '@hcengineering/lead'
  import notification from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import { AssigneePresenter } from '@hcengineering/task-resources'
  import { ActionIcon, Component, DueDatePresenter, IconMoreH, showPopup } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { ContextMenu, enabledConfig, openDoc } from '@hcengineering/view-resources'
  import lead from '../plugin'
  import LeadPresenter from './LeadPresenter.svelte'

  export let object: WithLookup<Lead>
  export let config: (string | BuildModelKey)[]

  const client = getClient()
  const assigneeAttribute = client.getHierarchy().getAttribute(lead.class.Lead, 'assignee')

  function showMenu (ev?: Event): void {
    showPopup(ContextMenu, { object }, (ev as MouseEvent).target as HTMLElement)
  }

  function showLead () {
    openDoc(client.getHierarchy(), object)
  }
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
          showMenu(evt)
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
  {#if enabledConfig(config, 'dueDate')}
    <div class="card-labels labels mb-2">
      <DueDatePresenter
        size={'small'}
        kind={'link-bordered'}
        width={'fit-content'}
        value={object.dueDate}
        shouldRender={object.dueDate !== null && object.dueDate !== undefined}
        shouldIgnoreOverdue={object.doneState !== null}
        onChange={async (e) => {
          await client.update(object, { dueDate: e })
        }}
      />
    </div>
  {/if}
  <div class="flex-between">
    <div class="flex-row-center gap-3 reverse mr-4">
      <LeadPresenter value={object} />
      {#if enabledConfig(config, 'attachments') && (object.attachments ?? 0) > 0}
        <AttachmentsPresenter value={object.attachments} {object} />
      {/if}
      {#if enabledConfig(config, 'comments') && (object.comments ?? 0) > 0}
        <CommentsPresenter value={object.comments} {object} />
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
