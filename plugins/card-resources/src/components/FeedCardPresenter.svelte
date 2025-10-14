<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import cardPlugin, { Card } from '@hcengineering/card'
  import { CardID, Label as CardLabel, Message, MessageType } from '@hcengineering/communication-types'
  import { SortingOrder, WithLookup } from '@hcengineering/core'
  import { createMessagesQuery } from '@hcengineering/presentation'

  import chat from '@hcengineering/chat'
  import { MessagePresenter, labelsStore } from '@hcengineering/communication-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Button, IconDetailsFilled, IconMoreH, tooltip } from '@hcengineering/ui'
  import { DocNavLink, showMenu } from '@hcengineering/view-resources'

  import CardPathPresenter from './CardPathPresenter.svelte'
  import CardTagsColored from './CardTagsColored.svelte'
  import CardTimestamp from './CardTimestamp.svelte'

  import { openCardInSidebar } from '../utils'

  import ColoredCardIcon from './ColoredCardIcon.svelte'
  import ContentPreview from './ContentPreview.svelte'
  import TagDivider from './TagDivider.svelte'

  export let card: WithLookup<Card>
  export let isCompact = false
  export let isComfortable2 = false

  const messagesQuery = createMessagesQuery()

  let message: Message | undefined = undefined
  let messages: Message[] = []

  // Check if the card is a thread type
  $: isThreadCard = card._class === chat.masterTag.Thread

  // Only query messages if this is a thread card
  $: if (isThreadCard) {
    messagesQuery.query(
      { cardId: card._id, limit: 3, order: SortingOrder.Ascending },
      (res) => {
        messages = res.getResult().reverse()
        message = messages.findLast((msg) => msg.type === MessageType.Text)
      },
      {
        attachments: true,
        reactions: true
      }
    )
  } else {
    // Clear message data for non-thread cards
    messages = []
    message = undefined
  }

  function hasNewMessages (labels: CardLabel[], cardId: CardID): boolean {
    return labels.some((it) => (it.labelId as string) === cardPlugin.label.NewMessages && it.cardId === cardId)
  }

  $: truncatedTitle = card.title.length > 300 ? card.title.substring(0, 300) + '...' : card.title

  let isActionsOpened = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="card">
  <div class="card__avatar">
    <ColoredCardIcon {card} count={0} />
  </div>

  <div class="card__body">
    <div class="card__header">
      <div class="flex-presenter">
        {#if hasNewMessages($labelsStore, card._id)}
          <div class="flex pr-1">
            <span class="notifyMarker" />
          </div>
        {/if}
        <span
          class="card__title overflow-label"
          use:tooltip={{ label: getEmbeddedLabel(truncatedTitle), textAlign: 'left' }}
        >
          <DocNavLink object={card}>
            {truncatedTitle}
          </DocNavLink>
        </span>
      </div>
      <CardTimestamp date={card.modifiedOn} />
      {#if !isComfortable2}
        <div class="flex-presenter flex-gap-0-5 tags-container">
          <div class="card__tags">
            <CardTagsColored value={card} showType={false} collapsable fullWidth />
          </div>
        </div>
      {/if}
      <div class="card__actions flex-row flex-row-center" class:opened={isActionsOpened}>
        <Button
          icon={IconDetailsFilled}
          iconProps={{ size: 'medium' }}
          kind="icon"
          on:click={() => {
            void openCardInSidebar(card._id, card)
          }}
        />
        {#if !isCompact}
          <Button
            icon={IconMoreH}
            iconProps={{ size: 'medium' }}
            kind="icon"
            dataId="btnMoreActions"
            on:click={(e) => {
              isActionsOpened = true
              showMenu(e, { object: card }, () => {
                isActionsOpened = false
              })
            }}
          />
        {/if}
      </div>
    </div>
    <div class="card__message">
      {#if isThreadCard && message}
        <MessagePresenter
          {card}
          {message}
          hideHeader
          hideAvatar
          readonly
          padding="0"
          showThreads={false}
          maxHeight={'10rem'}
        />
      {:else if !isThreadCard && card.content}
        <ContentPreview {card} maxHeight={'10rem'} />
      {/if}
    </div>
    <div class="card__parent" class:wrap={isComfortable2}>
      <CardPathPresenter {card} />
      {#if isComfortable2}
        <div class="flex-presenter flex-gap-0-5 tags-container">
          <CardPathPresenter {card} />
          <TagDivider />
          <div class="card__tags mr-2">
            <CardTagsColored value={card} showType={false} collapsable fullWidth />
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .card {
    display: flex;
    cursor: pointer;
    border-radius: 0.5rem;
    padding: 0.375rem 1rem;

    gap: 0.75rem;
    min-height: 4.75rem;
    width: 100%;
    height: fit-content;

    &:hover {
      background-color: var(--global-ui-hover-BackgroundColor);
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow: hidden;
      width: 100%;
    }

    &__header {
      display: flex;
      flex-direction: row;
      overflow: hidden;
      align-items: center;
      height: 2rem;
      gap: 0.5rem;
      width: 100%;
    }

    &__tags {
      display: flex;
      flex-direction: row;
      height: 2rem;
      min-width: 0;
      flex-grow: 1;
    }

    &__title {
      color: var(--global-primary-TextColor);
      font-weight: 500;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    &__avatar {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      margin-top: 0.625rem;
    }

    &__message {
      display: flex;
      color: var(--global-secondary-TextColor);
    }

    &__parent {
      display: flex;
      align-items: center;

      &.wrap {
        flex-wrap: wrap;
      }
    }

    &__actions {
      min-width: 4rem;
    }

    .notifyMarker {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 50%;
      background-color: var(--global-higlight-Color);

      min-width: 0.5rem;
      height: 0.5rem;
    }
    .tags-container {
      max-width: none;
      flex-grow: 1;
    }
  }
</style>
