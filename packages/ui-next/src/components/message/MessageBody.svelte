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
  import { PersonPreviewProvider } from '@hcengineering/contact-resources'
  import { formatName, Person } from '@hcengineering/contact'
  import { Message } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'

  import { AvatarSize } from '../../types'
  import uiNext from '../../plugin'
  import { toMarkup } from '../../utils'
  import MessageInput from './MessageInput.svelte'
  import Label from '../Label.svelte'
  import MessageContentViewer from './MessageContentViewer.svelte'
  import Avatar from '../Avatar.svelte'

  export let card: Card
  export let author: Person | undefined
  export let message: Message
  export let isEditing = false

  function formatDate (date: Date): string {
    return date.toLocaleTimeString('default', {
      hour: 'numeric',
      minute: 'numeric'
    })
  }
</script>

<div class="message__body">
  <div class="message__avatar">
    <PersonPreviewProvider value={author}>
      <Avatar name={author?.name} avatar={author} size={AvatarSize.Small} />
    </PersonPreviewProvider>
  </div>
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
      {#if message.edited}
        <div class="message__edited-marker">
          <Label label={uiNext.string.Edited} />
        </div>
      {/if}
    </div>
    {#if !isEditing}
      <div class="message__text">
        <MessageContentViewer {message} {card} />
      </div>
    {:else}
      <MessageInput
        {card}
        {message}
        content={toMarkup(message.content)}
        onCancel={() => {
          isEditing = false
        }}
        on:edited={() => {
          isEditing = false
        }}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .message__body {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    align-self: stretch;
    min-width: 0;
    overflow: hidden;
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
    user-select: text;
  }
</style>
