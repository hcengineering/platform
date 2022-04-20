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
  import { AttachmentList, AttachmentRefInput } from '@anticrm/attachment-resources'
  import type { ChunterMessage, Message } from '@anticrm/chunter'
  import { Employee, EmployeeAccount, formatName } from '@anticrm/contact'
  import { Ref, WithLookup, getCurrentAccount } from '@anticrm/core'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { getResource } from '@anticrm/platform'
  import { Avatar, getClient, MessageViewer } from '@anticrm/presentation'
  import ui, { ActionIcon, IconMoreH, Menu, showPopup, Label, Tooltip, Button } from '@anticrm/ui'
  import { Action } from '@anticrm/view'
  import { getActions } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { AddToSaved, DeleteFromSaved, UnpinMessage } from '../index'
  import chunter from '../plugin'
  import { getTime } from '../utils'
  // import Share from './icons/Share.svelte'
  import Bookmark from './icons/Bookmark.svelte'
  import Emoji from './icons/Emoji.svelte'
  import Thread from './icons/Thread.svelte'
  import Reactions from './Reactions.svelte'
  import Replies from './Replies.svelte'

  export let message: WithLookup<ChunterMessage>
  export let employees: Map<Ref<Employee>, Employee>
  export let thread: boolean = false
  export let isPinned: boolean = false
  export let isSaved: boolean = false

  let refInput: AttachmentRefInput

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

  $: isEditing = false

  const editAction = {
    label: chunter.string.EditMessage,
    action: () => (isEditing = true)
  }

  const deleteAction = {
    label: chunter.string.DeleteMessage,
    action: async () => {
      ;(await client.findAll(chunter.class.ThreadMessage, { attachedTo: message._id as Ref<Message> })).forEach((c) => {
        UnpinMessage(c)
        DeleteFromSaved(c)
      })
      UnpinMessage(message)
      await client.removeDoc(message._class, message.space, message._id)
    }
  }

  let menuShowed = false

  const showMenu = async (ev: Event): Promise<void> => {
    const actions = await getActions(client, message, message._class)
    actions.push(subscribeAction)
    actions.push(pinActions)

    menuShowed = true
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
          ...(getCurrentAccount()._id === message.createBy ? [editAction, deleteAction] : [])
        ]
      },
      ev.target as HTMLElement,
      () => {
        menuShowed = false
      }
    )
  }

  async function onMessageEdit (event: CustomEvent) {
    const { message: newContent, attachments: newAttachments } = event.detail

    await client.update(message, {
      content: newContent,
      attachments: newAttachments
    })
    isEditing = false
  }

  function getEmployee (message: WithLookup<ChunterMessage>): Employee | undefined {
    const employee = (message.$lookup?.createBy as EmployeeAccount).employee
    if (employee !== undefined) {
      return employees.get(employee)
    }
  }

  function openThread () {
    dispatch('openThread', message._id)
  }

  function addToSaved () {
    if (isSaved) DeleteFromSaved(message)
    else AddToSaved(message)
  }

  $: parentMessage = message as Message
  $: hasReplies = (parentMessage?.replies?.length ?? 0) > 0
</script>

<div class="container">
  <div class="avatar"><Avatar size={'medium'} avatar={employee?.avatar} /></div>
  <div class="message">
    <div class="header">
      {#if employee}{formatName(employee.name)}{/if}
      <span>{getTime(message.createOn)}</span>
      {#if message.editedOn}
        <span>
          <Tooltip label={ui.string.TimeTooltip} props={{ value: getTime(message.editedOn) }}>
            <Label label={chunter.string.Edited} />
          </Tooltip>
        </span>
      {/if}
    </div>
    {#if isEditing}
      <AttachmentRefInput
        bind:this={refInput}
        space={message.space}
        _class={message._class}
        objectId={message._id}
        content={message.content}
        showSend={false}
        on:message={onMessageEdit}
      />
      <div class="flex-row-reverse gap-2 reverse">
        <Button label={chunter.string.EditCancel} on:click={() => (isEditing = false)} />
        <Button label={chunter.string.EditUpdate} on:click={() => refInput.submit()} />
      </div>
    {:else}
      <div class="text"><MessageViewer message={message.content} /></div>
      {#if message.attachments}<div class="attachments"><AttachmentList {attachments} /></div>{/if}
    {/if}
    {#if reactions || (!thread && hasReplies)}
      <div class="footer flex-col">
        {#if reactions}<Reactions />{/if}
        {#if !thread && hasReplies}
          <Replies message={parentMessage} on:click={openThread} />
        {/if}
      </div>
    {/if}
  </div>
  <div class="buttons" class:menuShowed>
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
    <div class="tool book">
      <ActionIcon
        icon={Bookmark}
        size={'medium'}
        action={addToSaved}
        label={isSaved ? chunter.string.RemoveFromSaved : chunter.string.AddToSaved}
      />
    </div>
    <!-- <div class="tool"><ActionIcon icon={Share} size={'medium'}/></div> -->
    <div class="tool"><ActionIcon icon={Emoji} size={'medium'} /></div>
  </div>
</div>

<style lang="scss">
  .container {
    position: relative;
    display: flex;
    padding: 2rem;

    .avatar {
      min-width: 2.25rem;
    }

    .message {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 1rem;

      .header {
        display: flex;
        align-items: center;
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
        user-select: contain;
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
      top: 0.5rem;
      right: 1rem;
      display: flex;
      flex-direction: row-reverse;
      user-select: none;

      .tool + .tool {
        margin-right: 0.5rem;
      }

      &.menuShowed {
        visibility: visible;
      }
    }

    &:hover > .buttons {
      visibility: visible;
    }

    &:hover {
      background-color: var(--board-card-bg-hover);
    }
  }
</style>
