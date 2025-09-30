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
  import { PersonPreviewProvider, Avatar, translationStore } from '@hcengineering/contact-resources'
  import { formatName, Person } from '@hcengineering/contact'
  import { CardID, Message, MessageID } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { Label } from '@hcengineering/ui'

  import communication from '../../plugin'
  import MessageInput from './MessageInput.svelte'
  import MessageContentViewer from './MessageContentViewer.svelte'
  import MessageFooter from './MessageFooter.svelte'
  import {
    translateMessagesStore,
    messageEditingStore,
    TranslateMessagesStatus,
    showOriginalMessagesStore
  } from '../../stores'
  import { showOriginalMessage } from '../../actions'

  export let card: Card
  export let author: Person | undefined
  export let message: Message
  export let isEditing = false
  export let compact: boolean = false
  export let hideAvatar: boolean = false
  export let hideHeader: boolean = false
  export let showThreads: boolean = true

  function formatDate (date: Date): string {
    return date.toLocaleTimeString('default', {
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  let isTranslating = false
  let translateStatus: TranslateMessagesStatus | undefined = undefined
  let translateShown = false

  $: language = $translationStore?.enabled === true ? $translationStore?.translateTo : undefined
  $: dontTranslate = $translationStore?.enabled === true ? $translationStore?.dontTranslate ?? [] : []

  $: translateStatus = $translateMessagesStore.find((it) => it.cardId === card._id && it.messageId === message.id)
  $: isTranslating = translateStatus?.inProgress === true
  $: translateShown = isTranslateShown(message, translateStatus, language, $showOriginalMessagesStore, dontTranslate)

  function isTranslateShown (
    message: Message,
    translateStatus?: TranslateMessagesStatus,
    language?: string,
    showOriginalMessages: Array<[CardID, MessageID]> = [],
    dontTranslate: string[] = []
  ): boolean {
    const showOriginal = showOriginalMessages.some(([cId, mId]) => cId === card._id && mId === message.id)

    if (showOriginal) return false
    if (translateStatus?.result != null) return true
    if (language == null || message.language === language) return false
    if (message.language != null && dontTranslate.includes(message.language)) return false

    const translate = message.translates?.[language]

    return translate != null
  }
</script>

{#if compact || hideHeader}
  <div class="message__body">
    {#if !hideHeader}
      <div class="time-container">
        <div class="message__time message--time_hoverable">
          <div class="message__date">
            {formatDate(message.created)}
          </div>
        </div>
      </div>
    {/if}

    <div class="message__content">
      {#if !isEditing && message.content !== ''}
        <div class="message__text">
          <MessageContentViewer {message} {card} {author} />
        </div>
      {:else if isEditing}
        <MessageInput
          {card}
          {message}
          onCancel={() => {
            messageEditingStore.set(undefined)
          }}
          on:edited={() => {
            messageEditingStore.set(undefined)
          }}
        />
      {/if}
      {#if !isEditing}
        <MessageFooter {message} {showThreads} />
      {/if}
    </div>
  </div>
{:else}
  <div class="message__body">
    {#if !hideAvatar}
      <div class="message__avatar">
        <PersonPreviewProvider value={author}>
          <Avatar name={author?.name} person={author} size="medium" />
        </PersonPreviewProvider>
      </div>
    {/if}
    <div class="message__content">
      <div class="message__header">
        <PersonPreviewProvider value={author}>
          <div class="message__username">
            {formatName(author?.name ?? '')}
          </div>
        </PersonPreviewProvider>
        <div class="message__date">
          {formatDate(message.created)}
        </div>
        {#if message.modified}
          <div class="message__edited-marker">
            (<Label label={communication.string.Edited} />)
          </div>
        {/if}
        {#if isTranslating}
          <div class="message__translating">
            <Label label={communication.string.Translating} />
          </div>
        {/if}
        {#if translateShown}
          <div class="message__show-original" on:click={() => showOriginalMessage(message, card)}>
            <Label label={communication.string.ShowOriginal} />
          </div>
        {/if}
      </div>
      {#if !isEditing}
        <div class="message__text">
          <MessageContentViewer {message} {card} {author} />
        </div>
      {:else if isEditing}
        <MessageInput
          {card}
          {message}
          onCancel={() => {
            messageEditingStore.set(undefined)
          }}
          on:edited={() => {
            messageEditingStore.set(undefined)
          }}
        />
      {/if}
      {#if !isEditing}
        <MessageFooter {message} {showThreads} />
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .message__body {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    align-self: stretch;
    min-width: 0;
    position: relative;
    //overflow: hidden;
  }

  .message__avatar {
    display: flex;
    width: 2.5rem;
    flex-direction: column;
    align-items: center;
    align-self: stretch;
  }

  .message__content {
    display: flex;
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
    color: var(--global-primary-TextColor);
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .message__date {
    color: var(--global-tertiary-TextColor);
    font-size: 0.75rem;
    font-weight: 400;
    white-space: nowrap;
  }

  .message__edited-marker {
    text-transform: lowercase;
    color: var(--global-tertiary-TextColor);
    font-size: 0.75rem;
    font-weight: 400;
  }

  .message__translating {
    color: var(--global-tertiary-TextColor);
    font-size: 0.75rem;
    font-weight: 400;
  }

  .message__show-original {
    font-size: 0.75rem;
    color: var(--global-tertiary-TextColor);
    cursor: pointer;

    &:hover {
      color: var(--global-secondary-TextColor);
    }
  }

  .message__text {
    color: var(--global-primary-TextColor);
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    overflow: hidden;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    user-select: text;
    flex: 1;
  }

  .time-container {
    position: relative;
    width: 2.5rem;
  }

  .message__time {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 1.313rem;
    right: 0;
    visibility: hidden;
  }
</style>
