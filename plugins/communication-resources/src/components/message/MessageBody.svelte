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
  import { PersonPreviewProvider, Avatar } from '@hcengineering/contact-resources'
  import { formatName, Person } from '@hcengineering/contact'
  import { Message } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import { IconDelete, Label } from '@hcengineering/ui'

  import communication from '../../plugin'
  import MessageInput from './MessageInput.svelte'
  import MessageContentViewer from './MessageContentViewer.svelte'
  import MessageFooter from './MessageFooter.svelte'
  import { translateMessagesStore, messageEditingStore } from '../../stores'
  import { showOriginalMessage } from '../../actions'

  export let card: Card
  export let author: Person | undefined
  export let message: Message
  export let isEditing = false
  export let compact: boolean = false
  export let hideAvatar: boolean = false
  export let hideHeader: boolean = false
  export let thread: boolean = true

  function formatDate (date: Date): string {
    return date.toLocaleTimeString('default', {
      hour: 'numeric',
      minute: 'numeric'
    })
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
        <MessageFooter {message} {thread} />
      {/if}
    </div>
  </div>
{:else}
  <div class="message__body">
    {#if !hideAvatar}
      <div class="message__avatar">
        {#if !message.removed}
          <PersonPreviewProvider value={author}>
            <Avatar name={author?.name} person={author} size="medium" />
          </PersonPreviewProvider>
        {:else}
          <Avatar icon={IconDelete} size="medium" />
        {/if}
      </div>
    {/if}
    <div class="message__content">
      <div class="message__header">
        {#if !message.removed}
          <PersonPreviewProvider value={author}>
            <div class="message__username">
              {formatName(author?.name ?? '')}
            </div>
          </PersonPreviewProvider>
        {/if}
        <div class="message__date">
          {formatDate(message.created)}
        </div>
        {#if message.edited && !message.removed}
          <div class="message__edited-marker">
            (<Label label={communication.string.Edited} />)
          </div>
        {/if}
        {#if !message.removed && $translateMessagesStore.get(message.id)?.inProgress === true}
          <div class="message__translating">
            <Label label={communication.string.Translating} />
          </div>
        {/if}
        {#if !message.removed && $translateMessagesStore.get(message.id)?.shown === true}
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
        <MessageFooter {message} {thread} />
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
