<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Attachment } from '@anticrm/attachment'
  import { AttachmentList } from '@anticrm/attachment-resources'
  import type { Message } from '@anticrm/chunter'
  import { Employee, EmployeeAccount, formatName } from '@anticrm/contact'
  import { Ref, WithLookup, getCurrentAccount } from '@anticrm/core'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { getResource } from '@anticrm/platform'
  import { Avatar, getClient, MessageViewer } from '@anticrm/presentation'
  import { ActionIcon, IconMoreH, Menu, showPopup, getCurrentLocation, navigate } from '@anticrm/ui'
  import { Action } from '@anticrm/view'
  import { getActions } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import chunter from '../plugin'
  import { getTime } from '../utils'
  // import Share from './icons/Share.svelte'
  import Bookmark from './icons/Bookmark.svelte'
  import Emoji from './icons/Emoji.svelte'
  import Thread from './icons/Thread.svelte'
  import Reactions from './Reactions.svelte'
  import Replies from './Replies.svelte'

  export let message: WithLookup<Message>
  export let employees: Map<Ref<Employee>, Employee>
  export let thread: boolean = false
  export let isPinned: boolean = false

  $: employee = getEmployee(message)
  $: attachments = (message.$lookup?.attachments ?? []) as Attachment[]

  const client = getClient()
  const dispatch = createEventDispatcher()

  const reactions: boolean = false

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()
  $: subscribed = ($lastViews.get(message._id) ?? -1) > -1
  $: subscribeAction = subscribed
    ? ({
        label: chunter.string.TurnOffReplies,
        action: chunter.actionImpl.UnsubscribeMessage
      } as Action)
    : ({
        label: chunter.string.GetNewReplies,
        action: chunter.actionImpl.SubscribeMessage
      } as Action)

  $: pinActions = isPinned
    ? ({
        label: chunter.string.UnpinMessage,
        action: chunter.actionImpl.UnpinMessage
      } as Action)
    : ({
        label: chunter.string.PinMessage,
        action: chunter.actionImpl.PinMessage
      } as Action)

  async function deleteMessage () {
      await client.remove(message)
      const loc = getCurrentLocation()

      if (loc.path[3] === message._id) {
        loc.path.length = 3
        navigate(loc)
      }  
    }

  const deleteAction = {
    label: chunter.string.DeleteMessage,
    action: deleteMessage
  }

  const showMenu = async (ev: Event): Promise<void> => {
    const actions = await getActions(client, message, chunter.class.Message)
    actions.push(subscribeAction)
    actions.push(pinActions)

    showPopup(
      Menu,
      {
        actions: [
          ...actions.map((a) => ({
            label: a.label,
            icon: a.icon,
            action: async () => {
              const impl = await getResource(a.action)
              await impl(message)
            }
          })),
          ...(getCurrentAccount()._id === message.createBy ? [deleteAction] : [])
        ]
      },
      ev.target as HTMLElement
    )
  }

  function getEmployee (message: WithLookup<Message>): Employee | undefined {
    const employee = (message.$lookup?.createBy as EmployeeAccount).employee
    if (employee !== undefined) {
      return employees.get(employee)
    }
  }

  function openThread () {
    dispatch('openThread', message._id)
  }
</script>

<div class="container">
  <div class="avatar"><Avatar size={'medium'} avatar={employee?.avatar} /></div>
  <div class="message">
    <div class="header">
      {#if employee}{formatName(employee.name)}{/if}
      <span>{getTime(message.createOn)}</span>
    </div>
    <div class="text"><MessageViewer message={message.content} /></div>
    {#if message.attachments}<div class="attachments"><AttachmentList {attachments} /></div>{/if}
    {#if reactions || message.replies}
      <div class="footer flex-col">
        <div>
          {#if reactions}<Reactions />{/if}
        </div>
        {#if !thread}
          <div>
            {#if message.replies?.length}<Replies
                replies={message.replies}
                lastReply={message.lastReply}
                on:click={openThread}
              />{/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
  <div class="buttons">
    <div class="tool">
      <ActionIcon
        icon={IconMoreH}
        size={'medium'}
        action={(e) => {
          showMenu(e)
        }}
      />
    </div>
    {#if !thread}
      <div class="tool"><ActionIcon icon={Thread} size={'medium'} action={openThread} /></div>
    {/if}
    <div class="tool"><ActionIcon icon={Bookmark} size={'medium'} /></div>
    <!-- <div class="tool"><ActionIcon icon={Share} size={'medium'}/></div> -->
    <div class="tool"><ActionIcon icon={Emoji} size={'medium'} /></div>
  </div>
</div>

<style lang="scss">
  .container {
    position: relative;
    display: flex;
    margin-bottom: 2rem;
    z-index: 1;

    .avatar {
      min-width: 2.25rem;
    }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 1rem;

      .header {
        font-weight: 500;
        font-size: 1rem;
        line-height: 150%;
        color: var(--theme-caption-color);
        margin-bottom: 0.25rem;

        span {
          margin-left: 0.5rem;
          font-weight: 400;
          font-size: 0.875rem;
          line-height: 1.125rem;
          opacity: 0.4;
        }
      }
      .text {
        line-height: 150%;
      }
      .attachments {
        margin-top: 1rem;
      }
      .footer {
        align-items: flex-start;
        margin-top: 0.5rem;
        user-select: none;

        div + div {
          margin-top: 0.5rem;
        }
      }
    }

    .buttons {
      position: absolute;
      visibility: hidden;
      top: -0.5rem;
      right: -0.5rem;
      display: flex;
      flex-direction: row-reverse;
      user-select: none;

      .tool + .tool {
        margin-right: 0.5rem;
      }
    }

    &:hover > .buttons {
      visibility: visible;
    }
    &:hover::before {
      content: '';
    }

    &::before {
      position: absolute;
      top: -1.25rem;
      left: -1.25rem;
      width: calc(100% + 2.5rem);
      height: calc(100% + 2.5rem);
      background-color: var(--theme-button-bg-enabled);
      border: 1px solid var(--theme-bg-accent-color);
      border-radius: 0.75rem;
      z-index: -1;
    }
  }
</style>
