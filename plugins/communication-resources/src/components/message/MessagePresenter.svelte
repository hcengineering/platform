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
  export let thread: boolean = true

  let isEditing = false
  let isDeleted = false
  let author: Person | undefined

  $: isDeleted = message.removed
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

  $: showActions = !isEditing && !isDeleted && !readonly
  $: isThread = message.thread != null
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
  {#if message.type === MessageType.Activity || (message.removed && message.thread?.threadId === undefined)}
    <OneRowMessageBody {message} {card} {author} {hideAvatar} {hideHeader} />
  {:else}
    <MessageBody
      {message}
      {card}
      {author}
      {isEditing}
      compact={compact && !isThread}
      {hideAvatar}
      {hideHeader}
      {thread}
    />
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
</style>
