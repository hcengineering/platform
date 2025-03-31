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
  import { formatName, getPersonBySocialId, Person } from '@hcengineering/contact'
  import { createEventDispatcher } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/card'
  import { getCurrentAccount } from '@hcengineering/core'
  import { EmojiPopup, getEventPositionElement, showPopup, Action as MenuAction } from '@hcengineering/ui'
  import { personByPersonIdStore } from '@hcengineering/contact-resources'
  import type { SocialID } from '@hcengineering/communication-types'
  import { AttachmentPreview } from '@hcengineering/attachment-resources'
  import { Message, MessageType } from '@hcengineering/communication-types'

  import MessageContentViewer from './MessageContentViewer.svelte'
  import { AvatarSize } from '../../types'
  import Avatar from '../Avatar.svelte'
  import ReactionsList from '../ReactionsList.svelte'
  import MessageInput from './MessageInput.svelte'
  import Label from '../Label.svelte'
  import Menu from '../Menu.svelte'
  import uiNext from '../../plugin'
  import MessageReplies from './MessageReplies.svelte'
  import { toMarkup, toggleReaction } from '../../utils'

  export let card: Card
  export let message: Message
  export let editable: boolean = true

  const dispatch = createEventDispatcher()
  const client = getClient()
  const me = getCurrentAccount()

  let isEditing = false
  let author: Person | undefined

  $: void updateAuthor(message.creator)

  function canEdit (): boolean {
    if (!editable) return false
    if (message.type !== MessageType.Message) return false

    return me.socialIds.includes(message.creator)
  }

  async function updateAuthor (socialId: SocialID): Promise<void> {
    author = $personByPersonIdStore.get(socialId)

    if (author === undefined) {
      author = await getPersonBySocialId(client, socialId)
    }
  }

  function formatDate (date: Date): string {
    return date.toLocaleTimeString('default', {
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  async function handleEdit (): Promise<void> {
    if (!canEdit()) return
    isEditing = true
  }

  function handleCancelEdit (): void {
    isEditing = false
  }

  function handleContextMenu (event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()

    const actions: MenuAction[] = [
      {
        label: uiNext.string.Emoji,
        action: async (): Promise<void> => {
          showPopup(
            EmojiPopup,
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
      },
      {
        label: uiNext.string.Reply,
        action: async (): Promise<void> => {
          dispatch('reply', message)
        }
      }
    ]

    if (canEdit()) {
      actions.unshift({
        label: uiNext.string.Edit,
        action: handleEdit
      })
    }

    showPopup(Menu, { actions }, getEventPositionElement(event), () => {})
  }

  async function handleReaction (event: CustomEvent<string>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()
    const emoji = event.detail
    await toggleReaction(message, emoji)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="message" id={message.id.toString()}>
  <div class="message__body">
    <!--TODO: remove  on:contextmenu-->
    <div class="message__avatar" on:contextmenu={handleContextMenu}>
      <Avatar name={author?.name} avatar={author} size={AvatarSize.Small} />
    </div>
    <div class="message__content">
      <div class="message__header">
        <div class="message__username">
          {formatName(author?.name ?? '')}
        </div>
        <div class="message__date">
          {formatDate(message.created)}
        </div>
        {#if message.edited}
          <div class="message__edited-marker">
            <Label label={uiNext.string.Edited} />
          </div>
        {/if}
      </div>
      {#if !isEditing}
        <div class="message__text overflow-label">
          <MessageContentViewer {message} {card} />
        </div>
      {:else}
        <MessageInput
          cardId={message.card}
          messageId={message.id}
          content={toMarkup(message.content)}
          onCancel={handleCancelEdit}
        />
      {/if}
    </div>
  </div>
  {#if message.files.length > 0}
    <div class="message__files">
      {#each message.files as file (file.blobId)}
        <AttachmentPreview value={{ file: file.blobId, type: file.type, name: file.filename }} />
      {/each}
    </div>
  {/if}
  {#if message.reactions.length > 0}
    <div class="message__reactions">
      <ReactionsList reactions={message.reactions} on:click={handleReaction} />
    </div>
  {/if}
  {#if message.thread && message.thread.repliesCount > 0}
    <div class="message__replies">
      <MessageReplies
        count={message.thread.repliesCount}
        lastReply={message.thread.lastReply}
        on:click={() => dispatch('reply', message)}
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
    overflow: hidden;
  }

  .message__body {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    align-self: stretch;
    min-width: 0;
  }

  .message__avatar {
    display: flex;
    width: 2rem;
    flex-direction: column;
    align-items: center;
    align-self: stretch;
  }

  .message__content {
    display: flex;
    padding-bottom: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
    flex: 1 0 0;
    min-width: 0;
    max-width: 100%;
  }

  .message__header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .message__username {
    color: var(--next-text-color-primary);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .message__date {
    color: var(--next-text-color-tertiary);
    font-size: 0.75rem;
    font-weight: 400;
  }

  .message__edited-marker {
    text-transform: lowercase;
    color: var(--next-text-color-tertiary);
    font-size: 0.625rem;
    font-weight: 400;
  }

  .message__text {
    color: var(--next-text-color-primary);
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;

    display: flex;
    overflow: hidden;
    min-width: 0;
    max-width: 100%;
  }

  .message__reactions {
    padding-top: 0.25rem;
    margin-left: 2.75rem;
  }

  .message__replies {
    padding-top: 0.5rem;
    margin-left: 2.75rem;
    padding-bottom: 0;
  }
  .message__files {
    display: flex;
    gap: 0.375rem;
    overflow-x: auto;
  }
</style>
