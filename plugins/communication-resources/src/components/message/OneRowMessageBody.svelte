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
  import { IconDelete } from '@hcengineering/ui'

  import MessageContentViewer from './MessageContentViewer.svelte'
  import MessageFooter from './MessageFooter.svelte'

  export let card: Card
  export let author: Person | undefined
  export let message: Message
  export let hideAvatar: boolean = false
  export let hideHeader: boolean = false

  function formatDate (date: Date): string {
    return date.toLocaleTimeString('default', {
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  let isDeleted = false
  $: isDeleted = message.removed
</script>

<div class="message__body">
  {#if !hideAvatar}
    <div class="message__avatar">
      {#if !isDeleted}
        <PersonPreviewProvider value={author}>
          <Avatar name={author?.name} person={author} size="x-small" />
        </PersonPreviewProvider>
      {:else}
        <Avatar icon={IconDelete} size="x-small" />
      {/if}
    </div>
  {/if}
  {#if !isDeleted && !hideHeader}
    <div class="message__header">
      <PersonPreviewProvider value={author}>
        <div class="message__username">
          {formatName(author?.name ?? '')}
        </div>
      </PersonPreviewProvider>
      <div class="message__date">
        {formatDate(message.created)}
      </div>
    </div>
  {/if}

  <div class="message__text">
    <MessageContentViewer {message} {card} {author} />
  </div>
</div>
{#if !isDeleted}
  <div class="message__footer">
    <MessageFooter {message} />
  </div>
{/if}

<style lang="scss">
  .message__body {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }

  .message__avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    min-width: 2.5rem;
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
  }

  .message__text {
    color: var(--global-primary-TextColor);
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;

    display: flex;
    overflow: hidden;
    min-width: 0;
    max-width: 100%;
    user-select: text;
  }

  .message__footer {
    display: flex;
    flex-direction: column;
    margin-left: 3.5rem;
  }
</style>
