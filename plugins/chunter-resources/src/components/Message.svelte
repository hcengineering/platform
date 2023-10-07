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
  import { Attachment } from '@hcengineering/attachment'
  import { AttachmentList, AttachmentRefInput } from '@hcengineering/attachment-resources'
  import type { ChunterMessage, Message, Reaction } from '@hcengineering/chunter'
  import { PersonAccount } from '@hcengineering/contact'
  import { Avatar, personByIdStore, EmployeePresenter } from '@hcengineering/contact-resources'
  import { getCurrentAccount, Ref, WithLookup } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { getClient, MessageViewer } from '@hcengineering/presentation'
  import { EmojiPopup } from '@hcengineering/ui'
  import ui, { ActionIcon, Button, IconMoreH, Label, showPopup, tooltip } from '@hcengineering/ui'
  import { Action } from '@hcengineering/view'
  import { LinkPresenter, Menu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { AddMessageToSaved, DeleteMessageFromSaved, UnpinMessage } from '../index'
  import chunter from '../plugin'
  import { getLinks, getTime } from '../utils'
  // import Share from './icons/Share.svelte'
  import notification, { Collaborators } from '@hcengineering/notification'
  import Bookmark from './icons/Bookmark.svelte'
  import Emoji from './icons/Emoji.svelte'
  import Thread from './icons/Thread.svelte'
  import Reactions from './Reactions.svelte'
  import Replies from './Replies.svelte'

  export let message: WithLookup<ChunterMessage>
  export let savedAttachmentsIds: Ref<Attachment>[]
  export let thread: boolean = false
  export let isPinned: boolean = false
  export let isSaved: boolean = false
  export let isHighlighted = false

  let refInput: AttachmentRefInput

  $: empRef = (message.$lookup?.createBy as PersonAccount)?.person
  $: employee = empRef !== undefined ? $personByIdStore.get(empRef) : undefined
  $: attachments = (message.$lookup?.attachments ?? []) as Attachment[]

  const client = getClient()
  const hieararchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  const me = getCurrentAccount()._id

  $: reactions = message.$lookup?.reactions as Reaction[] | undefined

  $: subscribed = (
    hieararchy.as(message, notification.mixin.Collaborators) as any as Collaborators
  ).collaborators?.includes(me)
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
        DeleteMessageFromSaved(c)
      })
      UnpinMessage(message)
      await client.removeDoc(message._class, message.space, message._id)
    }
  }

  let menuShowed = false

  const showMenu = async (ev: Event): Promise<void> => {
    const actions = [pinActions]
    if (message._class === chunter.class.Message) {
      actions.push(subscribeAction)
    }

    menuShowed = true
    showPopup(
      Menu,
      {
        object: message,
        baseMenuClass: message._class,
        actions: [
          ...actions.map((a) => ({
            label: a.label,
            icon: a.icon,
            action: async (ctx: any, evt: MouseEvent) => {
              const impl = await getResource(a.action)
              await impl(message, evt)
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
    loading = false
  }

  function openThread () {
    dispatch('openThread', message._id)
  }

  function addToSaved () {
    if (isSaved) DeleteMessageFromSaved(message)
    else AddMessageToSaved(message)
  }

  function openEmojiPalette (ev: Event) {
    showPopup(
      EmojiPopup,
      {},
      ev.target as HTMLElement,
      async (emoji) => {
        if (!emoji) return
        const me = getCurrentAccount()._id

        const reaction = reactions?.find((r) => r.emoji === emoji && r.createBy === me)
        if (!reaction) {
          await client.addCollection(
            chunter.class.Reaction,
            message.space,
            message._id,
            chunter.class.ChunterMessage,
            'reactions',
            {
              emoji,
              createBy: me
            }
          )
        } else {
          await client.removeDoc(chunter.class.Reaction, message.space, reaction._id)
        }
      },
      () => {}
    )
  }

  async function removeReaction (ev: CustomEvent) {
    if (!ev.detail) return
    const me = getCurrentAccount()._id
    const reaction = await client.findOne(chunter.class.Reaction, {
      attachedTo: message._id,
      emoji: ev.detail,
      createBy: me
    })
    if (reaction?._id) {
      client.removeDoc(chunter.class.Reaction, reaction.space, reaction._id)
    }
  }

  $: parentMessage = message as Message
  $: hasReplies = (parentMessage?.replies?.length ?? 0) > 0

  $: links = getLinks(message.content)

  let loading = false
</script>

<div class="container clear-mins" class:highlighted={isHighlighted} id={message._id}>
  <div class="avatar">
    <Avatar size={'medium'} avatar={employee?.avatar} name={employee?.name} />
  </div>
  <div class="message clear-mins">
    <div class="header clear-mins">
      {#if employee}
        <EmployeePresenter value={employee} shouldShowAvatar={false} />
      {/if}
      <span>{getTime(message.createdOn ?? 0)}</span>
      {#if message.editedOn}
        <span use:tooltip={{ label: ui.string.TimeTooltip, props: { value: getTime(message.editedOn) } }}>
          <Label label={chunter.string.Edited} />
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
        bind:loading
      />
      <div class="flex-row-reverse gap-2 reverse">
        <Button label={chunter.string.EditCancel} on:click={() => (isEditing = false)} />
        <Button label={chunter.string.EditUpdate} on:click={() => refInput.submit()} />
      </div>
    {:else}
      <div class="text"><MessageViewer message={message.content} /></div>
      {#if message.attachments}
        <div class="attachments">
          <AttachmentList {attachments} {savedAttachmentsIds} />
        </div>
      {/if}
      {#each links as link}
        <LinkPresenter {link} />
      {/each}
    {/if}
    {#if reactions?.length || (!thread && hasReplies)}
      <div class="footer flex-col">
        {#if reactions?.length}<Reactions {reactions} on:remove={removeReaction} />{/if}
        {#if !thread && hasReplies}
          <Replies message={parentMessage} on:click={openThread} />
        {/if}
      </div>
    {/if}
  </div>
  <div class="buttons clear-mins" class:menuShowed>
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
    <div class="tool"><ActionIcon icon={Emoji} size={'medium'} action={openEmojiPalette} /></div>
  </div>
</div>

<style lang="scss">
  @keyframes highlight {
    50% {
      background-color: var(--theme-warning-color);
    }
  }
  .container {
    position: relative;
    display: flex;
    flex-shrink: 0;
    padding: 0.5rem 2rem;

    &.highlighted {
      animation: highlight 2000ms ease-in-out;
    }

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
        align-items: baseline;
        font-weight: 500;
        font-size: 1rem;
        line-height: 150%;
        color: var(--theme-caption-color);
        margin-bottom: 0.25rem;

        span {
          margin-left: 0.5rem;
          font-weight: 400;

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
      background-color: var(--highlight-hover);
    }
  }
</style>
