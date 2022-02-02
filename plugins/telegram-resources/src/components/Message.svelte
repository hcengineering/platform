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
  import type { SharedTelegramMessage } from '@anticrm/telegram'
  import { MessageViewer } from '@anticrm/presentation'
  import { formatName } from '@anticrm/contact'
  import { CheckBox } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { getPlatformColorForText } from '@anticrm/ui'

  export let message: SharedTelegramMessage
  export let showName: boolean = false
  export let selected: boolean = false
  export let selectable: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div
  class="flex-between"
  class:selectable
  on:click|preventDefault={() => {
    dispatch('select', message)
  }}
>
  <div class="flex-grow ml-6 flex" class:mr-6={!selectable} class:justify-end={!message.incoming}>
    <div class="message" class:outcoming={!message.incoming} class:selected>
      {#if showName}
        <div class="name" style="color: {getPlatformColorForText(message.sender)}">{formatName(message.sender)}</div>
      {/if}
      <div class="flex">
        <div class="caption-color mr-4"><MessageViewer message={message.content} /></div>
        <div class="time">
          {new Date(message.modifiedOn).toLocaleString('default', { hour: 'numeric', minute: 'numeric' })}
        </div>
      </div>
    </div>
  </div>
  {#if selectable}
    <div class="ml-4 mr-1"><CheckBox circle primary bind:checked={selected} /></div>
  {/if}
</div>

<style lang="scss">
  .message {
    padding: 0.5rem 0.75rem;
    max-width: 66%;
    width: fit-content;
    background-color: var(--theme-incoming-msg);
    border-radius: 0.75rem;
    overflow-wrap: anywhere;

    &.outcoming {
      background-color: var(--theme-outcoming-msg);
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

  .selectable {
    margin: 0 0.25rem 0 0;
    cursor: pointer;
    .selected {
      background-color: var(--primary-button-enabled);
    }
  }
</style>
