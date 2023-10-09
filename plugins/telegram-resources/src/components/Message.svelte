<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Attachment } from '@hcengineering/attachment'
  import { AttachmentList } from '@hcengineering/attachment-resources'
  import { formatName } from '@hcengineering/contact'
  import { WithLookup } from '@hcengineering/core'
  import { MessageViewer } from '@hcengineering/presentation'
  import type { SharedTelegramMessage } from '@hcengineering/telegram'
  import { CheckBox, getPlatformColorForText, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let message: WithLookup<SharedTelegramMessage>
  export let showName: boolean = false
  export let selected: boolean = false
  export let selectable: boolean = false
  $: attachments = message.$lookup?.attachments ? (message.$lookup.attachments as Attachment[]) : undefined

  const dispatch = createEventDispatcher()
</script>

<div class="message-row-bg" class:selectable class:selected-row={selected} data-type={message.incoming ? 'in' : 'out'}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="message-row"
    class:selectable
    class:selected-row={selected}
    on:click={() => {
      dispatch('select', message)
    }}
  >
    <div class="check-box">
      {#if selectable}<CheckBox circle kind={'accented'} bind:checked={selected} />{/if}
    </div>
    <div class="message-container" class:out={!message.incoming}>
      <div class="message" class:outcoming={!message.incoming} class:selected>
        {#if showName}
          <div class="name" style="color: {getPlatformColorForText(message.sender, $themeStore.dark)}">
            {formatName(message.sender)}
          </div>
        {/if}
        {#if attachments}
          <AttachmentList {attachments} />
        {/if}
        <div class="flex">
          <div class="caption-color mr-4"><MessageViewer message={message.content} /></div>
          <div class="time">
            {new Date(message.sendOn).toLocaleString('default', { hour: 'numeric', minute: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .message-row-bg {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: min-content;
  }
  .message-row {
    display: flex;
    justify-content: stretch;
    align-items: center;
    margin: 0 auto;
    width: 100%;
    min-width: 0;
    max-width: 900px;
  }

  .message-row.selectable,
  .message-row-bg.selectable {
    cursor: pointer;

    &:hover {
      background-color: var(--button-bg-hover);
    }
    &.selected-row {
      background-color: var(--button-bg-color);

      &:hover {
        background-color: var(--button-bg-hover);
      }
    }
    .message {
      cursor: pointer;
    }
    .selected {
      background-color: var(--primary-bg-color);

      &:hover {
        background-color: var(--primary-bg-hover);
      }
    }
  }

  .check-box {
    display: flex;
    justify-content: center;
    width: 2.5rem;
    min-width: 2.5rem;
    pointer-events: none;
  }
  .message-container {
    display: flex;
    justify-content: stretch;
    align-items: center;
    flex-grow: 1;
    margin-right: 2.5rem;
    padding: 0.25rem 0;

    &.out {
      justify-content: flex-end;
    }
  }
  .message {
    padding: 0.5rem 0.75rem;
    max-width: 90%;
    width: fit-content;
    background-color: var(--incoming-msg);
    border-radius: 0.75rem 0.75rem 0.75rem 0.125rem;
    overflow-wrap: anywhere;
    user-select: text;
    cursor: default;

    &.outcoming {
      background-color: var(--outcoming-msg);
      border-radius: 0.75rem 0.75rem 0.125rem 0.75rem;
    }
    .time {
      align-self: flex-end;
      margin-left: auto;
      color: var(--dark-color);
      font-size: 0.75rem;
      font-style: italic;
      white-space: nowrap;
    }
  }
</style>
