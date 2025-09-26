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
  import { Card } from '@hcengineering/card'
  import { getEventPositionElement, showPopup, Action, Menu } from '@hcengineering/ui'
  import type { MessageID, SocialID } from '@hcengineering/communication-types'
  import { Message, MessageType } from '@hcengineering/communication-types'
  import { getResource } from '@hcengineering/platform'
  import { MessageAction } from '@hcengineering/communication'
  import { Ref } from '@hcengineering/core'

  import MessageActionsPanel from './MessageActionsPanel.svelte'
  import MessageBody from './MessageBody.svelte'
  import OneRowMessageBody from './OneRowMessageBody.svelte'
  import {
    messageEditingStore,
    TranslateMessagesStatus,
    translateMessagesStore,
    threadCreateMessageStore
  } from '../../stores'
  import { getMessageActions } from '../../actions'
  import communication from '../../plugin'

  export let card: Card
  export let message: Message
  export let padding: string | undefined = undefined
  export let compact: boolean = false
  export let hideAvatar: boolean = false
  export let hideHeader: boolean = false
  export let readonly: boolean = false
  export let showThreads: boolean = true
  export let collapsible: boolean = false
  export let maxHeight: string = '30rem'

  let isEditing = false
  let author: Person | undefined
  let isExpanded = false
  let messageContainer: HTMLElement
  let needsExpansion = false

  $: isEditing = $messageEditingStore === message.id
  $: void updateAuthor(message.creator)

  async function updateAuthor (socialId: SocialID): Promise<void> {
    author = $employeeByPersonIdStore.get(socialId)

    if (author === undefined) {
      author = (await getPersonByPersonId(socialId)) ?? undefined
    }
  }

  $: updateStore(message)
  function updateStore (message: Message): void {
    if (!readonly && message.id === $threadCreateMessageStore?.id) {
      threadCreateMessageStore.set(message)
    }
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

  let allActions: MessageAction[] = []
  let excludedActions: Ref<MessageAction>[] = []
  let actions: MessageAction[] = []

  $: excludedActions = getExcludedActions($translateMessagesStore)

  $: void getMessageActions(message).then((res) => {
    allActions = res
  })

  $: actions = allActions.filter((it) => !excludedActions.includes(it._id))

  function getExcludedActions (translatedMessages: Map<MessageID, TranslateMessagesStatus>): Ref<MessageAction>[] {
    const result: TranslateMessagesStatus | undefined = translatedMessages.get(message.id)
    if (result === undefined || result.inProgress || !result.shown) {
      return [communication.messageAction.ShowOriginalMessage]
    } else if (result.shown) {
      return [communication.messageAction.TranslateMessage]
    }

    return []
  }

  function handleContextMenu (event: MouseEvent): void {
    const showCustomPopup = !isContentClicked(event.target as HTMLElement, event.clientX, event.clientY)
    if (!showCustomPopup) return

    event.preventDefault()
    event.stopPropagation()

    const contextMenuActions: Action[] = actions.map((action) => ({
      label: action.label,
      icon: action.icon,
      action: async () => {
        const actionFn = await getResource(action.action)
        await actionFn(message, card, event)
      }
    }))

    showPopup(Menu, { actions: contextMenuActions }, getEventPositionElement(event), () => {})
  }

  let isActionsPanelOpened = false

  $: showActions = !isEditing && !readonly

  // Check if message content needs expansion
  function checkContentHeight (): void {
    if (messageContainer != null && collapsible && !isExpanded) {
      const scrollHeight = messageContainer.scrollHeight
      const maxHeightPx = parseFloat(maxHeight.replace('rem', '')) * 16 // Convert rem to px
      needsExpansion = scrollHeight > maxHeightPx + 20 // 20px threshold
    } else {
      needsExpansion = false
    }
  }

  function toggleExpansion (event: MouseEvent): void {
    event.stopPropagation()
    isExpanded = !isExpanded
  }

  // Check content height after message updates
  $: if (message != null && messageContainer != null) {
    setTimeout(checkContentHeight, 100) // Small delay to ensure content is rendered
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="message"
  id={`${message.id}`}
  on:contextmenu={showActions ? handleContextMenu : undefined}
  class:active={isActionsPanelOpened && !isEditing}
  class:noHover={readonly}
  style:padding
>
  <div
    class="message-content"
    class:collapsible
    class:collapsed={collapsible && !isExpanded && needsExpansion}
    style:max-height={collapsible && !isExpanded ? maxHeight : 'none'}
    bind:this={messageContainer}
  >
    {#if message.type === MessageType.Activity}
      <OneRowMessageBody {message} {card} {author} {hideAvatar} {hideHeader} />
    {:else}
      <MessageBody
        {message}
        {card}
        {author}
        {isEditing}
        compact={compact && (message.thread == null || message.thread === undefined)}
        {hideAvatar}
        {hideHeader}
        {showThreads}
      />
    {/if}
  </div>

  {#if collapsible && needsExpansion && !isExpanded}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="show-more" on:click={toggleExpansion}>
      <span class="show-more-text">Show more</span>
    </div>
  {/if}

  {#if collapsible && isExpanded}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="show-more" on:click={toggleExpansion}>
      <span class="show-more-text">Show less</span>
    </div>
  {/if}

  {#if showActions}
    <div class="message__actions" class:opened={isActionsPanelOpened}>
      <MessageActionsPanel
        {message}
        {card}
        {actions}
        onOpen={() => {
          isActionsPanelOpened = true
        }}
        onClose={() => {
          isActionsPanelOpened = false
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
    padding: 0.5rem 1em;

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
    right: 2.25rem;
    visibility: hidden;
    z-index: 2;

    &.opened {
      visibility: visible;
    }
  }

  .message-content {
    width: 100%;

    &.collapsible.collapsed {
      overflow: hidden;
      position: relative;

      /* Use mask-image for transparent fade effect on text */
      -webkit-mask-image: linear-gradient(to bottom, black 0%, black 85%, transparent 100%);
      mask-image: linear-gradient(to bottom, black 0%, black 85%, transparent 100%);
      -webkit-mask-size: 100% 100%;
      mask-size: 100% 100%;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
    }
  }

  .show-more {
    cursor: pointer;
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    width: 100%;
    text-align: center;
    color: var(--theme-dark-color);
    font-size: .8125rem;
    font-weight: 400;
    border-radius: 0.25rem;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--global-ui-BackgroundColor);
    }

    .show-more-text {
      text-decoration: underline;
    }
  }
</style>
