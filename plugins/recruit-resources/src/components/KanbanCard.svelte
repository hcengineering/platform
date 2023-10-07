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
  import contact, { getName } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/contact-resources'
  import { WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import recruit, { Applicant, Candidate } from '@hcengineering/recruit'
  import { AssigneePresenter, StateRefPresenter } from '@hcengineering/task-resources'
  import tracker from '@hcengineering/tracker'
  import { Component, DueDatePresenter } from '@hcengineering/ui'
  import { BuildModelKey } from '@hcengineering/view'
  import { DocNavLink, ObjectPresenter, enabledConfig } from '@hcengineering/view-resources'
  import ApplicationPresenter from './ApplicationPresenter.svelte'

  export let object: WithLookup<Applicant>
  export let dragged: boolean
  export let groupByKey: string
  export let config: (string | BuildModelKey)[]

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const assigneeAttribute = hierarchy.getAttribute(recruit.class.Applicant, 'assignee')
  const isTitleHidden = client.getHierarchy().getAttribute(recruit.mixin.Candidate, 'title').hidden

  $: channels = (object.$lookup?.attachedTo as WithLookup<Candidate>)?.$lookup?.channels

  $: company = object?.$lookup?.space?.company
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-col pt-3 pb-3 pr-4 pl-4">
  <DocNavLink {object} noUnderline>
    {#if enabledConfig(config, 'space') || enabledConfig(config, 'company')}
      <div
        class="flex-between gap-2 mb-3"
        class:flex-between-half-content={enabledConfig(config, 'space') && company && enabledConfig(config, 'company')}
      >
        {#if enabledConfig(config, 'space')}
          <ObjectPresenter _class={recruit.class.Vacancy} objectId={object.space} value={object.$lookup?.space} />
        {/if}
        {#if company && enabledConfig(config, 'company')}
          <ObjectPresenter _class={contact.class.Organization} objectId={company} />
        {/if}
      </div>
    {/if}
    <div class="flex-between mb-1">
      <div class="flex-row-center">
        <Avatar avatar={object.$lookup?.attachedTo?.avatar} size={'medium'} name={object.$lookup?.attachedTo?.name} />
        <div class="flex-grow flex-col min-w-0 ml-2">
          <div class="fs-title over-underline lines-limit-2">
            {object.$lookup?.attachedTo ? getName(client.getHierarchy(), object.$lookup.attachedTo) : ''}
          </div>
          {#if !isTitleHidden && enabledConfig(config, 'title')}
            <div class="text-sm lines-limit-2">{object.$lookup?.attachedTo?.title ?? ''}</div>
          {/if}
        </div>
      </div>
      <div class="tool flex-row-center">
        {#if !dragged}
          <div class="mr-2">
            <Component
              showLoading={false}
              is={notification.component.NotificationPresenter}
              props={{ value: object }}
            />
          </div>
        {/if}
      </div>
    </div>
    {#if channels && channels.length > 0 && enabledConfig(config, 'channels')}
      <div class="card-labels labels mb-2">
        <Component
          showLoading={false}
          is={contact.component.ChannelsPresenter}
          props={{ value: channels, object: object.$lookup?.attachedTo, length: 'full', size: 'inline', kind: 'list' }}
        />
      </div>
    {/if}
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
          value={object.dueDate}
          shouldRender={object.dueDate !== null && object.dueDate !== undefined}
          shouldIgnoreOverdue={object.doneState !== null}
          onChange={async (e) => {
            await client.update(object, { dueDate: e })
          }}
        />
      {/if}
    </div>
    <div class="flex-between">
      <div class="flex-row-center gap-3 reverse mr-4">
        {#if enabledConfig(config, '')}
          <ApplicationPresenter value={object} />
        {/if}
        {#if (object.attachments ?? 0) > 0 && enabledConfig(config, 'attachments')}
          <AttachmentsPresenter value={object.attachments} {object} />
        {/if}
        {#if enabledConfig(config, 'comments')}
          {#if (object.comments ?? 0) > 0}
            <CommentsPresenter value={object.comments} {object} kind={'list'} size={'x-small'} />
          {/if}
          {#if object.$lookup?.attachedTo !== undefined && (object.$lookup.attachedTo.comments ?? 0) > 0}
            <CommentsPresenter
              value={object.$lookup?.attachedTo?.comments}
              object={object.$lookup?.attachedTo}
              withInput={false}
              kind={'list'}
              size={'x-small'}
            />
          {/if}
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
  </DocNavLink>
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
