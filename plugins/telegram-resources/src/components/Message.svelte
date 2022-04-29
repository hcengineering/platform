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
  import { Attachment } from '@anticrm/attachment'
  import { AttachmentList } from '@anticrm/attachment-resources'
  import { formatName } from '@anticrm/contact'
  import { WithLookup } from '@anticrm/core'
  import { MessageViewer } from '@anticrm/presentation'
  import type { SharedTelegramMessage } from '@anticrm/telegram'
  import { CheckBox, getPlatformColorForText } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let message: WithLookup<SharedTelegramMessage>
  export let showName: boolean = false
  export let selected: boolean = false
  export let selectable: boolean = false
  $: attachments = message.$lookup?.attachments ? (message.$lookup.attachments as Attachment[]) : undefined

  const dispatch = createEventDispatcher()
</script>

<div
  class="message-row"
  class:selectable
  class:selected-row={selected}
  on:click={() => {
    dispatch('select', message)
  }}
>
  <div class="check-box">
    {#if selectable}<CheckBox circle primary bind:checked={selected} />{/if}
  </div>
  <div class="message-container" class:out={!message.incoming}>
    <div class="message" class:outcoming={!message.incoming} class:selected>
      {#if showName}
        <div class="name" style="color: {getPlatformColorForText(message.sender)}">{formatName(message.sender)}</div>
      {/if}
      {#if attachments}
        <AttachmentList {attachments} />
      {/if}
      <div class="flex">
        <div class="caption-color mr-4"><MessageViewer message={message.content} /></div>
        <div class="time">
          {new Date(message.modifiedOn).toLocaleString('default', { hour: 'numeric', minute: 'numeric' })}
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .message-row {
    display: flex;
    justify-content: stretch;
    align-items: center;

    &.selectable {
      cursor: pointer;

      &:hover {
        background-color: var(--highlight-hover);
      }
      &.selected-row {
        background-color: var(--highlight-select);

        &:hover {
          background-color: var(--highlight-hover);
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
    max-width: 66%;
    width: fit-content;
    background-color: var(--theme-incoming-msg);
    border-radius: 0.75rem 0.75rem 0.75rem 0.25rem;
    overflow-wrap: anywhere;
    user-select: text;
    cursor: default;

    &.outcoming {
      background-color: var(--theme-outcoming-msg);
      border-radius: 0.75rem 0.75rem 0.25rem 0.75rem;
    }
    .time {
      align-self: flex-end;
      margin-left: auto;
      color: var(--theme-content-trans-color);
      font-size: 0.75rem;
      font-style: italic;
      white-space: nowrap;
    }
  }
</style>
