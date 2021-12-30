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
  class="flex-row-center clear-mins message-conatiner"
  on:click|preventDefault={() => {
    dispatch('select', message)
  }}
>
  {#if selectable}
    <div class="mr-4"><CheckBox circle primary bind:checked={selected} /></div>
  {/if}
  <div class="flex-col message" class:selected>
    <div class="flex-between small-text mb-4">
      <div class="content-trans-color overflow-label mr-4">From: <span class="content-accent-color">{formatName(message.sender)}</span></div>
      <div class="content-trans-color">{getTime(message.modifiedOn)}</div>
    </div>
    <div class="fs-title overflow-label mb-1">
      {message.subject}
    </div>
    <div class="overflow-label">
      {message.textContent}
    </div>
  </div>
</div>

<style lang="scss">
  .message-conatiner {
    margin: 0 1.5rem;
    cursor: pointer;
  }

  .message {
    padding: 1rem;
    min-width: 0;
    background-color: var(--theme-incoming-msg);
    border-radius: .75rem;
    white-space: nowrap;

    &.selected { background-color: var(--primary-button-enabled); }
  }
</style>
