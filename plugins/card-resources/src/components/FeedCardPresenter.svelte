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
  import { ExtendedMessagePreview, labelsStore } from '@hcengineering/communication-resources'
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
  import CardSection from './CardSection.svelte'

  export let card: WithLookup<Card>
  export let isCompact = false
  export let isComfortable2 = false

  const messagesQuery = createMessagesQuery()

  let messages: Message[] = []

  // Check if the card is a thread type
  $: isThreadCard = card._class === chat.masterTag.Thread

  // Only query messages if this is a thread card
  $: if (isThreadCard) {
    messagesQuery.query(
      { cardId: card._id, limit: 3, order: SortingOrder.Descending },
      (res) => {
        messages = res
          .getResult()
          .filter((msg) => msg.type === MessageType.Text)
          .reverse()
      },
      {
        attachments: true,
        reactions: true
      }
    )
  } else {
    // Clear message data for non-thread cards
    messages = []
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
  <div class="card__main">
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
  <div class="card__content-preview">
    <CardSection>
      {#if isThreadCard && messages.length > 0}
        <div class="content-preview">
          {#each messages as message}
            <ExtendedMessagePreview {card} {message} socialId={message.creator} date={message.created} />
          {/each}
        </div>
      {:else if !isThreadCard && card.content}
        <div class="content-preview extra-padding">
          <ContentPreview {card} maxHeight={'10rem'} />
        </div>
      {/if}
    </CardSection>
  </div>
</div>

<style lang="scss">
  .card {
    display: flex;
    flex-direction: column;
    border-radius: 0.5rem;
    padding: 0.375rem 1rem;
    width: 100%;
    height: fit-content;

    &:hover {
      background-color: var(--global-ui-hover-BackgroundColor);
    }

    &__main {
      display: flex;
      flex-direction: row;
      gap: 0.75rem;
    }

    &__body {
      display: flex;
      flex-direction: column;
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

    &__parent {
      display: flex;
      align-items: center;
      margin-top: -0.125rem;

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

    &__content-preview {
      display: flex;
      color: var(--global-secondary-TextColor);
      padding: 0.25rem 0 0 0.25rem;
      width: 100%;

      .content-preview {
        width: 100%;
        padding: 0.125rem;
        &.extra-padding {
          padding: 0.5rem 0.5rem 0.5rem 0.75rem;
        }
      }
    }
  }
</style>
