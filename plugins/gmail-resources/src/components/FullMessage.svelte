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
  import { SharedMessage } from '@anticrm/gmail'
  import Button from '@anticrm/ui/src/components/Button.svelte'
  import { createEventDispatcher } from 'svelte'
  import { IconArrowLeft, Label } from '@anticrm/ui'
  import gmail from '../plugin'
  import FullMessageContent from './FullMessageContent.svelte'

  export let currentMessage: SharedMessage
  export let newMessage: boolean

  let editor: HTMLDivElement
  $: if (editor) editor.innerHTML = currentMessage.content

  const dispatch = createEventDispatcher()

  $: title = currentMessage.incoming ? currentMessage.sender : currentMessage.receiver
  $: user = currentMessage.incoming ? currentMessage.receiver : currentMessage.sender
</script>

<div class="flex-between clear-mins header">
  <div
    class="flex-center icon"
    on:click={() => {
      dispatch('close')
    }}
  >
    <IconArrowLeft size="medium" />
  </div>
  <div class="flex-grow flex-col mr-4 min-w-0">
    <div class="fs-title overflow-label">{currentMessage.subject}</div>
    <div class="text-sm content-dark-color overflow-label">
      <Label label={currentMessage.incoming ? gmail.string.From : gmail.string.To} />
      {title}
    </div>
  </div>
  <div class="mr-3">
    <Button
      label={gmail.string.Reply}
      size={'small'}
      primary
      on:click={() => {
        newMessage = true
      }}
    />
  </div>
</div>
<div class="flex-col clear-mins right-content">
  <Label label={currentMessage.incoming ? gmail.string.To : gmail.string.From} />
  {user}
  {#if currentMessage.copy?.length}
    <Label label={gmail.string.Copy} />: {currentMessage.copy.join(', ')}
  {/if}
  <div class="flex-col h-full clear-mins mt-9">
    <FullMessageContent content={currentMessage.content} />
  </div>
</div>

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0 6rem 0 2.5rem;
    height: 4rem;
    color: var(--theme-content-accent-color);
    border-bottom: 1px solid var(--theme-zone-bg);

    .icon {
      flex-shrink: 0;
      margin-right: 1rem;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--theme-caption-color);
      border-radius: 50%;
      cursor: pointer;
    }
  }

  .right-content {
    flex-grow: 1;
    padding: 1.5rem 2.5rem;
  }
</style>
