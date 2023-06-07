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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentPresenter } from '@hcengineering/attachment-resources'
  import { SharedMessage } from '@hcengineering/gmail'
  import { createQuery } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import gmail from '../plugin'
  import FullMessageContent from './FullMessageContent.svelte'

  export let message: SharedMessage

  const query = createQuery()
  let attachments: Attachment[] = []

  $: message._id &&
    query.query(
      attachment.class.Attachment,
      {
        attachedTo: message._id
      },
      (res) => (attachments = res)
    )

  $: title = message.incoming ? message.sender : message.receiver
  $: user = message.incoming ? message.receiver : message.sender
</script>

<div class="popup h-full w-full flex-col">
  <div class="fs-title mb-4">
    {message.subject}
  </div>
  <div>
    <Label label={message.incoming ? gmail.string.From : gmail.string.To} />
    {title}
  </div>
  <div>
    <Label label={message.incoming ? gmail.string.To : gmail.string.From} />
    {user}
  </div>
  {#if message.copy?.length}
    <Label label={gmail.string.Copy} />: {message.copy.join(', ')}
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
  <div class="flex-col h-full clear-mins mt-5">
    <FullMessageContent content={message.content} />
  </div>
</div>

<style lang="scss">
  .popup {
    padding: 1rem;
    max-height: calc(100vh - 4rem);
    background-color: var(--popup-bg-hover);
    border-radius: 0.75rem;
    box-shadow: var(--popup-shadow);
  }
</style>
