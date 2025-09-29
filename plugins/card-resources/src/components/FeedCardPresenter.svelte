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
  import { createMessagesQuery, MessageViewer } from '@hcengineering/presentation'
  import { PersonId, SortingOrder, WithLookup } from '@hcengineering/core'
  import { CardID, Message, MessageType, Label as CardLabel } from '@hcengineering/communication-types'
  import { getPersonByPersonIdStore } from '@hcengineering/contact-resources'
  import { Person } from '@hcengineering/contact'
  import { MessagePresenter, labelsStore } from '@hcengineering/communication-resources'
  import { Button, IconMoreH, tooltip } from '@hcengineering/ui'
  import { showMenu } from '@hcengineering/view-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import chat from '@hcengineering/chat'

  import CardTagsColored from './CardTagsColored.svelte'
  import CardPathPresenter from './CardPathPresenter.svelte'
  import CardTimestamp from './CardTimestamp.svelte'
  import MessagePreview from './preview/MessagePreview.svelte'

  import { openCardInSidebar } from '../utils'

  import InboxCardIcon from './InboxCardIcon.svelte'
  import TagDivider from './TagDivider.svelte'
  import ContentPreview from './ContentPreview.svelte'

  export let card: WithLookup<Card>
  export let isCompact = false
  export let isComfortable2 = false

  const messagesQuery = createMessagesQuery()

  let message: Message | undefined = undefined
  let messages: Message[] = []

  let socialId: PersonId | undefined = undefined
  let person: Person | undefined = undefined

  $: messagesQuery.query(
    { cardId: card._id, limit: 5, order: SortingOrder.Ascending },
    (res) => {
      messages = res.getResult().reverse()
      message = messages.findLast((msg) => msg.type === MessageType.Text)
    },
    {
      attachments: true,
      reactions: true
    }
  )

  $: socialId = message?.creator ?? card.modifiedBy
  $: personStore = getPersonByPersonIdStore([socialId])
  $: person = $personStore.get(socialId)

  function hasNewMessages (labels: CardLabel[], cardId: CardID): boolean {
    return labels.some((it) => (it.labelId as string) === cardPlugin.label.NewMessages && it.cardId === cardId)
  }

  // Check if the card is a thread type
  $: isThreadCard = card._class === chat.masterTag.Thread

  let isActionsOpened = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="card" on:click|stopPropagation|preventDefault={() => openCardInSidebar(card._id, card)}>
  <div class="card__avatar">
    <InboxCardIcon {card} count={0} />
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
          use:tooltip={{ label: getEmbeddedLabel(card.title), textAlign: 'left' }}
        >
          {card.title}
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
    </div>
    <div class="card__message">
      {#if isThreadCard && message}
        <MessagePresenter {card} {message} hideHeader hideAvatar readonly padding="0" showThreads={false} />
      {:else if !isThreadCard && card.content}
        <ContentPreview {card} maxHeight={'10rem'} />
      {/if}
    </div>
    <div class="card__updates">
      <div class="card__update-item">
        <div class="card__update-marker" />
        <MessagePreview {card} {message} date={new Date(card.modifiedOn)} creator={message?.creator} />
      </div>
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

  {#if !isCompact}
    <div class="card__actions" class:opened={isActionsOpened}>
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
    </div>
  {/if}
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

      .card__actions {
        visibility: visible;
      }
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
      min-height: 1.375rem;
      color: var(--global-secondary-TextColor);
    }

    &__updates {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      margin-top: var(--spacing-1);
      padding-left: 0.5rem;
    }

    &__update-item {
      position: relative;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      user-select: none;

      &:first-child .card__update-marker {
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
      }

      &:last-child .card__update-marker {
        border-bottom-left-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
      }

      &:hover .card__update-marker {
        border-radius: 0.5rem;
        background: var(--global-primary-LinkColor);
      }
    }

    &__update-marker {
      position: absolute;
      width: 0.25rem;
      height: 100%;
      background: var(--global-ui-highlight-BackgroundColor);
      border-radius: 0;
    }

    &__parent {
      display: flex;
      align-items: center;
      margin-top: 0.5rem;

      &.wrap {
        flex-wrap: wrap;
      }
    }

    &__actions {
      display: flex;
      flex-direction: column;
      margin-left: auto;
      padding-left: 0.5rem;
      visibility: hidden;

      &.opened {
        visibility: visible;
      }
      &:hover {
        visibility: visible;
      }
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
