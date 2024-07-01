<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import view from '@hcengineering/view'
  import activity from '@hcengineering/activity'
  import { MessageViewer } from '@hcengineering/presentation'
  import { LinkPresenter } from '@hcengineering/view-resources'
  import { Button, ShowMore } from '@hcengineering/ui'
  import { AttachmentDocList, AttachmentImageSize } from '@hcengineering/attachment-resources'
  import { Attachment } from '@hcengineering/attachment'
  import { Doc, Ref, WithLookup } from '@hcengineering/core'
  import { ChatMessage, ExternalChannel } from '@hcengineering/chunter'
  import { createEventDispatcher } from 'svelte'

  import ChatMessageInput from './ChatMessageInput.svelte'

  export let value: WithLookup<ChatMessage>
  export let attachmentsDoc: Doc | undefined = undefined
  export let message: string
  export let object: Doc | undefined
  export let isEditing: boolean
  export let attachments: Attachment[]
  export let withShowMore: boolean = false
  export let attachmentImageSize: AttachmentImageSize = 'x-large'
  export let links: HTMLLinkElement[] = []
  export let videoPreload = true
  export let externalChannel: Ref<ExternalChannel> | undefined = undefined

  const dispatch = createEventDispatcher()
  let refInput: ChatMessageInput
</script>

{#if !isEditing}
  {#if withShowMore}
    <ShowMore>
      <div class="clear-mins">
        <MessageViewer {message} />
        <AttachmentDocList
          value={attachmentsDoc ?? value}
          {attachments}
          imageSize={attachmentImageSize}
          {videoPreload}
        />
        {#each links as link}
          <LinkPresenter {link} />
        {/each}
      </div>
    </ShowMore>
  {:else}
    <div class="clear-mins">
      <MessageViewer {message} />
      <AttachmentDocList value={attachmentsDoc ?? value} {attachments} imageSize={attachmentImageSize} {videoPreload} />
      {#each links as link}
        <LinkPresenter {link} />
      {/each}
    </div>
  {/if}
{:else if object}
  <ChatMessageInput
    bind:this={refInput}
    chatMessage={value}
    shouldSaveDraft={false}
    focusIndex={1000}
    autofocus
    {object}
    {externalChannel}
    on:submit={() => {
      dispatch('submit')
    }}
  />
  <div class="flex-row-center gap-2 justify-end mt-2">
    <Button
      label={view.string.Cancel}
      on:click={() => {
        dispatch('cancel')
      }}
    />
    <Button label={activity.string.Update} accent on:click={() => refInput.submit()} />
  </div>
{/if}
