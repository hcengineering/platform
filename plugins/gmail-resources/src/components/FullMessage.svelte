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
  import { NewMessage, SharedMessage } from '@hcengineering/gmail'
  import Button from '@hcengineering/ui/src/components/Button.svelte'
  import { createEventDispatcher } from 'svelte'
  import { IconArrowLeft, Label, Scroller, tooltip } from '@hcengineering/ui'
  import gmail from '../plugin'
  import FullMessageContent from './FullMessageContent.svelte'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentPresenter } from '@hcengineering/attachment-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Ref } from '@hcengineering/core'

  export let currentMessage: SharedMessage
  export let newMessage: boolean

  let editor: HTMLDivElement
  $: if (editor) editor.innerHTML = currentMessage.content

  const dispatch = createEventDispatcher()
  const hasError = (currentMessage as unknown as NewMessage)?.status === 'error'

  const query = createQuery()
  const client = getClient()
  let attachments: Attachment[] = []

  async function resendMessage (): Promise<void> {
    const messageId = currentMessage._id as string as Ref<NewMessage>
    await client.updateDoc(gmail.class.NewMessage, currentMessage.space, messageId, { status: 'new' })
  }

  $: currentMessage._id &&
    query.query(
      attachment.class.Attachment,
      {
        attachedTo: currentMessage._id
      },
      (res) => (attachments = res)
    )

  $: title = currentMessage.incoming ? currentMessage.sender : currentMessage.receiver
  $: user = currentMessage.incoming ? currentMessage.receiver : currentMessage.sender
</script>

<div class="popupPanel-body__main-header bottom-divider">
  <div class="flex-between p-2">
    <div class="flex-row-center clear-mins">
      <Button
        icon={IconArrowLeft}
        kind={'ghost'}
        on:click={() => {
          dispatch('close')
        }}
      />
      <div class="flex-grow flex-col clear-mins ml-2 mr-2">
        <div class="overflow-label" use:tooltip={{ label: getEmbeddedLabel(currentMessage.subject) }}>
          {currentMessage.subject}
        </div>
        <span class="content-color">
          <Label label={currentMessage.incoming ? gmail.string.From : gmail.string.To} />
          <b>{title}</b>
        </span>
      </div>
    </div>
    <div class="buttons-group small-gap">
      <Button
        label={hasError ? gmail.string.Resend : gmail.string.Reply}
        size={'small'}
        kind={'accented'}
        on:click={() => {
          if (hasError) {
            resendMessage()
            dispatch('close')
          } else newMessage = true
        }}
      />
    </div>
  </div>
</div>
<Scroller>
  <div class="popupPanel-body__main-content py-4 h-full">
    <Label label={currentMessage.incoming ? gmail.string.To : gmail.string.From} />
    {user}
    {#if currentMessage.copy?.length}
      <Label label={gmail.string.Copy} />: {currentMessage.copy.join(', ')}
    {/if}
    {#if attachments.length}
      <div class="flex-row-center list mt-2">
        {#each attachments as attachment}
          <div class="item flex">
            <AttachmentPresenter value={attachment} showPreview />
          </div>
        {/each}
      </div>
    {/if}
    <div class="flex-col content clear-mins h-full">
      <FullMessageContent content={currentMessage.content} />
    </div>
  </div>
</Scroller>

<style lang="scss">
  .list {
    padding: 0.5rem;
    color: var(--caption-color);
    overflow-x: auto;
    overflow-y: hidden;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.25rem;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--divider-color);
    }
  }
  .content {
    margin-top: 1rem;
    background-color: var(--incoming-msg);
    border-radius: 0.25rem;
  }
</style>
