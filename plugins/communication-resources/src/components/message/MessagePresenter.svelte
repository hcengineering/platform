<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Person } from '@hcengineering/contact'
  import { employeeByPersonIdStore, getPersonByPersonId } from '@hcengineering/contact-resources'
  import { getClient, getCommunicationClient } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/card'
  import { getCurrentAccount } from '@hcengineering/core'
  import ui, {
    getEventPositionElement,
    showPopup,
    Action as MenuAction,
    IconDelete,
    IconEdit,
    Menu
  } from '@hcengineering/ui'
  import type { SocialID } from '@hcengineering/communication-types'
  import { Message, MessageType } from '@hcengineering/communication-types'
  import emojiPlugin from '@hcengineering/emoji'

  import communication from '../../plugin'
  import { toggleReaction, replyToThread } from '../../utils'
  import MessageActionsPanel from './MessageActionsPanel.svelte'
  import IconMessageMultiple from '../icons/MessageMultiple.svelte'
  import MessageBody from './MessageBody.svelte'
  import OneRowMessageBody from './OneRowMessageBody.svelte'

  export let card: Card
  export let message: Message
  export let editable: boolean = true
  export let replies: boolean = true
  export let padding: string | undefined = undefined
  export let compact: boolean = false
  export let hideAvatar: boolean = false

  const client = getClient()
  const communicationClient = getCommunicationClient()
  const me = getCurrentAccount()

  let isEditing = false
  let isDeleted = false
  let author: Person | undefined

  $: isDeleted = message.removed || (message.type === MessageType.Thread && message.thread == null)
  $: void updateAuthor(message.creator)

  function canEdit (): boolean {
    if (!editable) return false
    if (message.type !== MessageType.Message) return false
    if (message.thread != null) return false

    return me.socialIds.includes(message.creator)
  }

  function canRemove (): boolean {
    if (!editable) return false
    if (message.type !== MessageType.Message) return false

    return me.socialIds.includes(message.creator)
  }

  function canReply (): boolean {
    return message.type === MessageType.Message || message.type === MessageType.Thread
  }

  async function updateAuthor (socialId: SocialID): Promise<void> {
    author = $employeeByPersonIdStore.get(socialId)

    if (author === undefined) {
      author = await getPersonByPersonId(socialId) ?? undefined
    }
  }

  async function handleEdit (): Promise<void> {
    if (!canEdit()) return
    isEditing = true
  }

  async function handleRemove (): Promise<void> {
    if (!canRemove()) return
    message.removed = true
    await communicationClient.removeMessage(message.card, message.id, message.created)
  }

  function isInside (x: number, y: number, rect: DOMRect): boolean {
    return x >= rect.left && y >= rect.top && x <= rect.right && y <= rect.bottom
  }

  function isContentClicked (element: HTMLElement | null, x: number, y: number): boolean {
    if (element == null) {
      return false
    }

    const nodes = element.childNodes
    const range = document.createRange()

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]

      if (node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.ELEMENT_NODE) continue

      range.selectNodeContents(node)

      if (isInside(x, y, range.getBoundingClientRect())) {
        return true
      }
    }
    return false
  }

  function handleContextMenu (event: MouseEvent): void {
    const showCustomPopup = !isContentClicked(event.target as HTMLElement, event.clientX, event.clientY)
    if (showCustomPopup) {
      event.preventDefault()
      event.stopPropagation()

      const actions: MenuAction[] = []

      actions.push({
        label: communication.string.Emoji,
        icon: emojiPlugin.icon.Emoji,
        action: async (): Promise<void> => {
          showPopup(
            emojiPlugin.component.EmojiPopup,
            {},
            event.target as HTMLElement,
            async (result) => {
              const emoji = result?.emoji
              if (emoji == null) {
                return
              }

              await toggleReaction(message, emoji)
            },
            () => {}
          )
        }
      })

      if (canReply()) {
        actions.push({
          label: communication.string.Reply,
          icon: IconMessageMultiple,
          action: async (): Promise<void> => {
            await replyToThread(message, card)
          }
        })
      }

      if (canEdit()) {
        actions.push({
          label: communication.string.Edit,
          icon: IconEdit,
          action: handleEdit
        })
      }

      if (canRemove()) {
        actions.push({
          label: ui.string.Remove,
          icon: IconDelete,
          action: handleRemove
        })
      }

      showPopup(Menu, { actions }, getEventPositionElement(event), () => {})
    }
  }

  let isActionsOpened = false

  $: isThread = message.thread != null || message.type === MessageType.Thread
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="message"
  id={`${message.id}`}
  on:contextmenu={editable && !isEditing && !isDeleted ? handleContextMenu : undefined}
  class:active={isActionsOpened && !isEditing}
  class:noHover={!editable}
  style:padding
>
  {#if isThread || message.type === MessageType.Activity || message.removed}
    <OneRowMessageBody {message} {card} {author} {replies} {hideAvatar} />
  {:else}
    <MessageBody {message} {card} {author} bind:isEditing {compact} {replies} {hideAvatar} />
  {/if}

  {#if !isEditing && editable && !isDeleted}
    <div class="message__actions" class:opened={isActionsOpened}>
      <MessageActionsPanel
        {message}
        editable={canEdit()}
        canReply={canReply()}
        canRemove={canRemove()}
        bind:isOpened={isActionsOpened}
        on:edit={handleEdit}
        on:remove={handleRemove}
        on:reply={() => {
          void replyToThread(message, card)
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .message {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    align-self: stretch;
    min-width: 0;
    position: relative;
    padding: 0.5rem 4rem;

    &:hover:not(.noHover) {
      background: var(--global-ui-BackgroundColor);

      .message__actions {
        visibility: visible;
      }
    }

    &.active {
      background: var(--global-ui-BackgroundColor);
    }
  }

  :global(.message:hover) :global(.message--time_hoverable) {
    visibility: visible;
  }

  .message__actions {
    position: absolute;
    top: -0.75rem;
    right: 1rem;
    visibility: hidden;
    z-index: 2;

    &.opened {
      visibility: visible;
    }
  }
</style>
