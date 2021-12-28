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

<div class="flex-between header">
  <div
    class="flex-center icon"
    on:click={() => {
      dispatch('close')
    }}
  >
    <div class="scale-75">
      <IconArrowLeft size="large" />
    </div>
  </div>
  <div class="flex-grow flex-col">
    <div class="fs-title">{currentMessage.subject}</div>
    <div class="small-text content-dark-color">
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
<div class="h-full right-content">
  <div>
    <Label label={currentMessage.incoming ? gmail.string.To : gmail.string.From} />
    {user}
  </div>
  {#if currentMessage.copy?.length}
    <Label label={gmail.string.Copy} />: {currentMessage.copy.join(', ')}
  {/if}
  <div class="mt-9">
    <FullMessageContent content={currentMessage.content} />
  </div>
</div>

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0 6rem 0 2.5rem;
    height: 4rem;
    color: var(--theme-content-accent-color);
    border-bottom: 1px solid var(--theme-card-divider);

    .icon {
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
    padding: 2rem;
  }
</style>
