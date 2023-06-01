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
  import { Hierarchy, WithLookup } from '@hcengineering/core'
  import notification from '@hcengineering/notification'
  import { getClient } from '@hcengineering/presentation'
  import recruit, { Applicant, Candidate } from '@hcengineering/recruit'
  import { AssigneePresenter, StateRefPresenter } from '@hcengineering/task-resources'
  import tracker from '@hcengineering/tracker'
  import { Component, DueDatePresenter, showPanel } from '@hcengineering/ui'
  import view, { BuildModelKey } from '@hcengineering/view'
  import { ObjectPresenter, enabledConfig } from '@hcengineering/view-resources'
  import ApplicationPresenter from './ApplicationPresenter.svelte'

  export let object: WithLookup<Applicant>
  export let dragged: boolean
  export let groupByKey: string
  export let config: (string | BuildModelKey)[]

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const assigneeAttribute = hierarchy.getAttribute(recruit.class.Applicant, 'assignee')
  const isTitleHidden = client.getHierarchy().getAttribute(recruit.mixin.Candidate, 'title').hidden

  function showCandidate () {
    showPanel(view.component.EditDoc, object._id, Hierarchy.mixinOrClass(object), 'content')
  }

  $: channels = (object.$lookup?.attachedTo as WithLookup<Candidate>)?.$lookup?.channels

  $: company = object?.$lookup?.space?.company
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-col pt-2 pb-2 pr-4 pl-4 cursor-pointer" on:click={showCandidate}>
  {#if enabledConfig(config, 'space') || enabledConfig(config, 'company')}
    <div class="p-1 flex-between gap-2">
      {#if enabledConfig(config, 'space')}
        <ObjectPresenter _class={recruit.class.Vacancy} objectId={object.space} value={object.$lookup?.space} />
      {/if}
      {#if company && enabledConfig(config, 'company')}
        <ObjectPresenter _class={contact.class.Organization} objectId={company} />
      {/if}
    </div>
  {/if}
  <div class="flex-between mb-3">
    <div class="flex-row-center">
      <Avatar avatar={object.$lookup?.attachedTo?.avatar} size={'medium'} />
      <div class="flex-grow flex-col min-w-0 ml-2">
        <div class="fs-title over-underline lines-limit-2">
          {object.$lookup?.attachedTo ? getName(object.$lookup.attachedTo) : ''}
        </div>
        {#if !isTitleHidden && enabledConfig(config, 'title')}
          <div class="text-sm lines-limit-2">{object.$lookup?.attachedTo?.title ?? ''}</div>
        {/if}
      </div>
    </div>
    <div class="tool mr-1 flex-row-center">
      {#if !dragged}
        <div class="mr-2">
          <Component showLoading={false} is={notification.component.NotificationPresenter} props={{ value: object }} />
        </div>
      {/if}
    </div>
    {#if channels && channels.length > 0 && enabledConfig(config, 'channels')}
      <div class="tool mr-1 flex-row-center">
        <div class="step-lr75">
          <Component
            showLoading={false}
            is={contact.component.ChannelsPresenter}
            props={{ value: channels, object: object.$lookup?.attachedTo, length: 'tiny', size: 'inline' }}
          />
        </div>
      </div>
    {/if}
  </div>
  <div class="flex-between">
    <div class="flex-row-center">
      <div class="sm-tool-icon step-lr75">
        <div class="mr-2">
          <ApplicationPresenter value={object} inline />
        </div>
        <Component showLoading={false} is={tracker.component.RelatedIssueSelector} props={{ object }} />
      </div>
      {#if enabledConfig(config, 'dueDate')}
        <DueDatePresenter
          size={'small'}
          value={object.dueDate}
          shouldRender={object.dueDate !== null && object.dueDate !== undefined}
          shouldIgnoreOverdue={object.doneState !== null}
          onChange={async (e) => {
            await client.update(object, { dueDate: e })
          }}
        />
      {/if}
      <div class="flex-row-center gap-3">
        {#if (object.attachments ?? 0) > 0 && enabledConfig(config, 'attachments')}
          <AttachmentsPresenter value={object.attachments} {object} />
        {/if}
        {#if enabledConfig(config, 'comments')}
          {#if (object.comments ?? 0) > 0}
            <CommentsPresenter value={object.comments} {object} />
          {/if}
          {#if object.$lookup?.attachedTo !== undefined && (object.$lookup.attachedTo.comments ?? 0) > 0}
            <CommentsPresenter
              value={object.$lookup?.attachedTo?.comments}
              object={object.$lookup?.attachedTo}
              withInput={false}
            />
          {/if}
        {/if}
      </div>
    </div>
    {#if enabledConfig(config, 'assignee')}
      <AssigneePresenter
        value={object.assignee}
        issueId={object._id}
        defaultClass={contact.class.Employee}
        currentSpace={object.space}
        placeholderLabel={assigneeAttribute.label}
      />
    {/if}
  </div>
  {#if groupByKey !== 'state' && enabledConfig(config, 'state')}
    <StateRefPresenter
      size={'small'}
      value={object.state}
      onChange={(state) => {
        client.update(object, { state })
      }}
    />
  {/if}
</div>
