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
  import { getPersonBySocialId, Person } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'
  import cardPlugin, { Card } from '@hcengineering/card'
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import { getEventPositionElement, showPopup, Action as MenuAction } from '@hcengineering/ui'
  import { personByPersonIdStore } from '@hcengineering/contact-resources'
  import type { SocialID } from '@hcengineering/communication-types'
  import { AttachmentPreview } from '@hcengineering/attachment-resources'
  import { Message, MessageType } from '@hcengineering/communication-types'
  import { openDoc } from '@hcengineering/view-resources'
  import emojiPlugin from '@hcengineering/emoji'

  import ReactionsList from '../ReactionsList.svelte'
  import Menu from '../Menu.svelte'
  import uiNext from '../../plugin'
  import MessageReplies from './MessageReplies.svelte'
  import { toggleReaction, replyToThread } from '../../utils'
  import MessageActionsPanel from './MessageActionsPanel.svelte'
  import IconMessageMultiple from '../icons/IconMessageMultiple.svelte'
  import IconPen from '../icons/IconPen.svelte'
  import MessageBody from './MessageBody.svelte'
  import OneRowMessageBody from './OneRowMessageBody.svelte'

  export let card: Card
  export let message: Message
  export let editable: boolean = true
  export let replies: boolean = true
  export let padding: string | undefined = undefined

  const client = getClient()
  const me = getCurrentAccount()

  let isEditing = false
  let author: Person | undefined

  $: void updateAuthor(message.creator)

  function canEdit (): boolean {
    if (!editable) return false
    if (message.type !== MessageType.Message) return false
    if (message.thread != null) return false

    return me.socialIds.includes(message.creator)
  }

  function canReply (): boolean {
    return message.type === MessageType.Message
  }

  async function updateAuthor (socialId: SocialID): Promise<void> {
    author = $personByPersonIdStore.get(socialId)

    if (author === undefined) {
      author = await getPersonBySocialId(client, socialId)
    }
  }

  async function handleEdit (): Promise<void> {
    if (!canEdit()) return
    isEditing = true
  }

  async function handleReaction (event: CustomEvent<string>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()
    const emoji = event.detail
    await toggleReaction(message, emoji)
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

      if (message.thread == null) {
        actions.push({
          label: uiNext.string.Emoji,
          icon: emojiPlugin.icon.Emoji,
          action: async (): Promise<void> => {
            showPopup(
              emojiPlugin.component.EmojiPopup,
              {},
              event.target as HTMLElement,
              async (result) => {
                const emoji = result?.text
                if (emoji == null) {
                  return
                }

                await toggleReaction(message, emoji)
              },
              () => {}
            )
          }
        })
      }

      if (canReply()) {
        actions.push({
          label: uiNext.string.Reply,
          icon: IconMessageMultiple,
          action: async (): Promise<void> => {
            await replyToThread(message, card)
          }
        })
      }

      if (canEdit()) {
        actions.push({
          label: uiNext.string.Edit,
          icon: IconPen,
          action: handleEdit
        })
      }

      showPopup(Menu, { actions }, getEventPositionElement(event), () => {})
    }
  }

  let isActionsOpened = false

  async function handleReply (): Promise<void> {
    if (!canReply()) return
    const t = message.thread
    if (t === undefined) return
    const _id = t.thread
    const client = getClient()
    const c = await client.findOne(cardPlugin.class.Card, { _id: _id as Ref<Card> })
    if (c === undefined) return
    await openDoc(client.getHierarchy(), c)
  }

  $: isThread = message.thread != null
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="message"
  id={`${message.id}`}
  on:contextmenu={editable && !isEditing ? handleContextMenu : undefined}
  class:active={isActionsOpened && !isEditing}
  class:noHover={!editable}
  style:padding
>
  {#if !isEditing && editable}
    <div class="message__actions" class:opened={isActionsOpened}>
      <MessageActionsPanel
        {message}
        editable={canEdit()}
        canReply={canReply()}
        canReact={!isThread}
        bind:isOpened={isActionsOpened}
        on:edit={handleEdit}
        on:reply={() => {
          void replyToThread(message, card)
        }}
      />
    </div>
  {/if}

  {#if isThread || message.type === MessageType.Activity}
    <OneRowMessageBody {message} {card} {author} />
  {:else}
    <MessageBody {message} {card} {author} bind:isEditing />
  {/if}

  {#if !isThread && message.files.length > 0}
    <div class="message__files">
      {#each message.files as file (file.blobId)}
        <AttachmentPreview value={{ file: file.blobId, type: file.type, name: file.filename }} />
      {/each}
    </div>
  {/if}
  {#if !isThread && message.reactions.length > 0}
    <div class="message__reactions">
      <ReactionsList reactions={message.reactions} on:click={handleReaction} />
    </div>
  {/if}
  {#if replies && message.thread && message.thread.repliesCount > 0}
    <div class="message__replies overflow-label">
      <MessageReplies
        threadId={message.thread.thread}
        count={message.thread.repliesCount}
        lastReply={message.thread.lastReply}
        on:click={handleReply}
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
    padding: 1rem 4rem;

    &:hover:not(.noHover) {
      background: var(--next-message-hover-color-background);
      .message__actions {
        visibility: visible;
      }
    }

    &.active {
      background: var(--next-message-hover-color-background);
    }
  }

  .message__reactions {
    padding-top: 0.25rem;
    margin-left: 2.75rem;
  }

  .message__replies {
    padding-top: 0.5rem;
    margin-left: 2.25rem;
    padding-bottom: 0;
    display: flex;
    align-items: flex-start;
    align-self: stretch;
    overflow: hidden;
  }

  .message__files {
    display: flex;
    gap: 0.375rem;
    overflow-x: auto;
    margin-left: 2.75rem;
    height: 18.75rem;
  }

  .message__actions {
    position: absolute;
    top: -0.75rem;
    right: 1rem;
    visibility: hidden;

    &.opened {
      visibility: visible;
    }
  }
</style>
