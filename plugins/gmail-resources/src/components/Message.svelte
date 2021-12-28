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
  import type { SharedMessage } from '@anticrm/gmail'
  import { formatName } from '@anticrm/contact'
  import { CheckBox } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { getTime } from '../utils'

  export let message: SharedMessage
  export let selected: boolean = false
  export let selectable: boolean = false

  const dispatch = createEventDispatcher()
</script>

<div
  class="flex-between cursor-pointer"
  class:selectable
  on:click|preventDefault={() => {
    dispatch('select', message)
  }}
>
  <div class="flex-grow mr-6 flex" class:ml-6={!selectable}>
    {#if selectable}
      <div class="mr-4 ml-1"><CheckBox circle primary bind:checked={selected} /></div>
    {/if}
    <div class="flex-col message" class:selected>
      <div class="flex-between mb-2">
        <div class="mr-4">{formatName(message.sender)}</div>
        <div class="time">{getTime(message.modifiedOn)}</div>
      </div>
      <div class="flex content mb-1 fs-title">
        {message.subject}
      </div>
      <div class="flex content">
        {message.textContent}
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .message {
    padding: 0.75rem;
    width: 100%;
    max-width: 100%;
    background-color: var(--theme-incoming-msg);
    border-radius: 0.75rem;
    white-space: nowrap;

    .content {
      display: inline-block;
      white-space: nowrap;
      overflow-x: hidden;
      text-overflow: ellipsis;
      width: 300px; // PLEASE FIX IT)
    }

    .time {
      margin-left: auto;
    }
  }

  .selectable {
    margin: 0 0.25rem 0 0;
    .selected {
      background-color: var(--primary-button-enabled);
    }
  }
</style>
