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
  import type { NewMessage, SharedMessage } from '@hcengineering/gmail'
  import { AttachmentsPresenter } from '@hcengineering/attachment-resources'
  import { CheckBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { getTime } from '../utils'
  import gmail from '../plugin'

  export let message: SharedMessage
  export let selected: boolean = false
  export let selectable: boolean = false
  const isError = (message as unknown as NewMessage)?.status === 'error'
  const errorMessage = isError ? (message as unknown as NewMessage) : undefined

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="flex-row-center clear-mins message-conatiner step-tb5"
  on:click|preventDefault={() => {
    dispatch('select', message)
  }}
>
  <div class="flex-col message" class:selected>
    <div class="flex-between text-sm mb-1">
      <div class="content-dark-color overflow-label mr-4">
        <Label label={gmail.string.From} />
        <span class="content-color">{message.sender}</span>
      </div>
      <div class="content-dark-color flex-row-center gap-3">
        <AttachmentsPresenter value={message.attachments} object={message} size={'x-small'} />
        <span class="content-color">{!isError ? getTime(message.sendOn) : getTime(message.modifiedOn)}</span>
      </div>
    </div>
    <div class="content-dark-color text-sm overflow-label mr-4 mb-4">
      <Label label={gmail.string.To} />
      <span class="content-color">{message.receiver}</span>
    </div>
    <div class="fs-title overflow-label mb-1">
      {message.subject}
    </div>
    {#if !isError}
      <div class="overflow-label">
        {message.textContent}
      </div>
    {/if}
    {#if isError}
      <div class="error-color top-divider mt-2 pt-2">
        Error: {errorMessage && errorMessage?.error
          ? JSON.parse(errorMessage.error)?.data?.error_description
          : undefined ?? 'unknown error'}
      </div>
    {/if}
  </div>
  {#if selectable}
    <div class="ml-4"><CheckBox circle kind={'accented'} bind:checked={selected} /></div>
  {/if}
</div>

<style lang="scss">
  .message-conatiner {
    flex-shrink: 0;
    cursor: pointer;
  }

  .message {
    padding: 1rem;
    min-width: 0;
    background-color: var(--incoming-msg);
    border-radius: 0.75rem;
    white-space: nowrap;
    flex-grow: 1;

    &.selected {
      background-color: var(--accented-button-default);
    }
  }
</style>
