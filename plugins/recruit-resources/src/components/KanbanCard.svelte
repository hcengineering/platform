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
  import type { Applicant, Candidate } from '@hcengineering/recruit'
  import recruit from '@hcengineering/recruit'
  import { AssigneePresenter, StateRefPresenter } from '@hcengineering/task-resources'
  import tracker from '@hcengineering/tracker'
  import { Component, showPanel } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import ApplicationPresenter from './ApplicationPresenter.svelte'

  export let object: WithLookup<Applicant>
  export let dragged: boolean
  export let groupByKey: string

  const client = getClient()

  function showCandidate () {
    showPanel(view.component.EditDoc, object._id, Hierarchy.mixinOrClass(object), 'content')
  }

  $: channels = (object.$lookup?.attachedTo as WithLookup<Candidate>)?.$lookup?.channels

  $: company = object?.$lookup?.space?.company
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-col pt-2 pb-2 pr-4 pl-4 cursor-pointer" on:click={showCandidate}>
  <div class="p-1 flex-between">
    <ObjectPresenter _class={recruit.class.Vacancy} objectId={object.space} value={object.$lookup?.space} />
    {#if company}
      <div class="ml-2">
        <ObjectPresenter _class={contact.class.Organization} objectId={company} />
      </div>
    {/if}
  </div>
  <div class="flex-between mb-3">
    <div class="flex-row-center">
      <Avatar avatar={object.$lookup?.attachedTo?.avatar} size={'medium'} />
      <div class="flex-grow flex-col min-w-0 ml-2">
        <div class="fs-title over-underline lines-limit-2">
          {object.$lookup?.attachedTo ? getName(object.$lookup.attachedTo) : ''}
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
        <div class="mr-2">
          <ApplicationPresenter value={object} />
        </div>
        <Component is={tracker.component.RelatedIssueSelector} props={{ object }} />
      </div>
      {#if (object.attachments ?? 0) > 0}
        <div class="step-lr75">
          <AttachmentsPresenter value={object.attachments} {object} />
        </div>
      {/if}
      {#if (object.comments ?? 0) > 0 || (object.$lookup?.attachedTo !== undefined && (object.$lookup.attachedTo.comments ?? 0) > 0)}
        <div class="step-lr75">
          {#if (object.comments ?? 0) > 0}
            <CommentsPresenter value={object.comments} {object} />
          {/if}
          {#if object.$lookup?.attachedTo !== undefined && (object.$lookup.attachedTo.comments ?? 0) > 0}
            <CommentsPresenter value={object.$lookup?.attachedTo?.comments} object={object.$lookup?.attachedTo} />
          {/if}
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
  {#if groupByKey !== 'state'}
    <StateRefPresenter
      value={object.state}
      onChange={(state) => {
        client.update(object, { state })
      }}
    />
  {/if}
</div>
