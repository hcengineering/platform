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
  import { getMetadata } from '@anticrm/platform'
  import login from '@anticrm/login'
  import { NewMessage, SharedMessage } from '@anticrm/gmail'
  import EditBox from '@anticrm/ui/src/components/EditBox.svelte'
  import Button from '@anticrm/ui/src/components/Button.svelte'
  import { createEventDispatcher } from 'svelte'
  import { IconArrowLeft, Label } from '@anticrm/ui'
  import { Channel, Contact, formatName } from '@anticrm/contact'
  import { TextEditor } from '@anticrm/text-editor'
  import plugin from '../plugin'

  export let object: Contact
  export let channel: Channel
  export let currentMessage: SharedMessage | undefined

  let editor: TextEditor
  let copy: string = ''

  const obj: NewMessage = {
    subject: currentMessage ? 'RE: ' + currentMessage.subject : '',
    content: '',
    to: channel.value,
    replyTo: currentMessage?.messageId
  }

  const url = getMetadata(login.metadata.GmailUrl) ?? ''

  async function sendMsg () {
    fetch(url + '/send', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + getMetadata(login.metadata.LoginToken),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...obj,
        copy: copy.split(',').map((m) => m.trim())
      })
    })
    dispatch('close')
  }

  const dispatch = createEventDispatcher()
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
  <div class="flex-grow flex-col">
    <div class="fs-title">Gmail</div>
    <div class="text-sm content-dark-color overflow-label">
      <Label label={plugin.string.NewMessageTo} />
      <span class="content-accent-color">{formatName(object.name)} ({channel.value})</span>
    </div>
  </div>
  <div class="mr-3">
    <Button label={plugin.string.Send} size={'small'} primary on:click={sendMsg} />
  </div>
</div>
<div class="flex-col clear-mins right-content">
  <div class="mb-2">
    <EditBox
      label={plugin.string.Subject}
      bind:value={obj.subject}
      placeholder={plugin.string.SubjectPlaceholder}
      maxWidth={'min-content'}
    />
  </div>
  <div class="mb-4">
    <EditBox
      label={plugin.string.Copy}
      bind:value={copy}
      placeholder={plugin.string.CopyPlaceholder}
      maxWidth={'min-content'}
    />
  </div>
  <div class="input clear-mins">
    <TextEditor bind:this={editor} bind:content={obj.content} on:blur={editor.submit} />
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

    .input {
      overflow: auto;
      padding: 1rem;
      background-color: #fff;
      color: #1f212b;
      height: 100%;
      border-radius: .5rem;

      :global(.ProseMirror) {
        min-height: 0;
        max-height: 100%;
        height: 100%;
      }

      :global(a) {
        font: inherit;
        font-weight: 500;
        text-decoration: initial;
        color: initial;
        outline: initial;
        &:hover {
          color: initial;
          text-decoration: initial;
        }
        &:active {
          color: initial;
          text-decoration: initial;
        }
        &:visited {
          color: initial;
        }
      }
    }
  }
</style>
