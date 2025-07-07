<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getClient, getCommunicationClient } from '@hcengineering/presentation'
  import cardPlugin from '@hcengineering/card'
  import { getCurrentAccount } from '@hcengineering/core'
  import { AttachmentPreview, LinkPreview } from '@hcengineering/attachment-resources'
  import { LinkPreviewID, Message, MessageType } from '@hcengineering/communication-types'
  import { getResource } from '@hcengineering/platform'

  import ReactionsList from '../ReactionsList.svelte'
  import MessageThread from '../thread/Thread.svelte'
  import { toggleReaction } from '../../utils'

  export let message: Message

  const me = getCurrentAccount()
  const communicationClient = getCommunicationClient()

  function canReply (): boolean {
    return message.type !== MessageType.Activity && message.extra?.threadRoot !== true
  }

  async function handleReaction (event: CustomEvent<string>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()
    const emoji = event.detail
    await toggleReaction(message, emoji)
  }

  async function handleReply (): Promise<void> {
    if (!canReply()) return
    const t = message.thread
    if (t === undefined) return
    const _id = t.threadId
    const client = getClient()
    const c = await client.findOne(cardPlugin.class.Card, { _id })
    if (c === undefined) return
    const r = await getResource(cardPlugin.function.OpenCardInSidebar)
    await r(_id, c)
  }

  async function removeLinkPreview (id: LinkPreviewID): Promise<void> {
    await communicationClient.linkPreviewPatch(message.cardId, message.id, {
      detach: [id]
    })
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if message.blobs.length > 0 && !message.removed}
  <div class="message__files">
    {#each message.blobs as blob (blob.blobId)}
      <AttachmentPreview
        value={{
          file: blob.blobId,
          type: blob.mimeType,
          name: blob.fileName,
          size: blob.size,
          metadata: blob.metadata
        }}
        imageSize="x-large"
      />
    {/each}
  </div>
{/if}
{#if (message.linkPreviews ?? []).length > 0 && !message.removed}
  <div class="message__links">
    {#each message.linkPreviews as link (link.id)}
      <LinkPreview
        isOwn={me.socialIds.includes(message.creator)}
        on:delete={() => {
          void removeLinkPreview(link.id)
        }}
        linkPreview={{
          url: link.url,
          host: link.host,
          title: link.title,
          description: link.description,
          hostname: link.siteName,
          image: link.previewImage?.url,
          imageWidth: link.previewImage?.width,
          imageHeight: link.previewImage?.height,
          icon: link.iconUrl
        }}
      />
    {/each}
  </div>
{/if}
{#if message.reactions.length > 0 && !message.removed}
  <div class="message__reactions">
    <ReactionsList reactions={message.reactions} on:click={handleReaction} />
  </div>
{/if}
{#if message.thread && message.thread.threadId}
  <div class="message__replies overflow-label">
    <MessageThread thread={message.thread} on:click={handleReply} />
  </div>
{/if}

<style lang="scss">
  .message__reactions {
    padding-top: 0.25rem;
  }

  .message__replies {
    padding-top: 0.5rem;
    margin-left: -0.5rem;
    padding-bottom: 0;
    display: flex;
    align-items: flex-start;
    align-self: stretch;
    overflow: hidden;
  }

  .message__files {
    display: grid;
    grid-gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, 25rem);
    min-height: 2.5rem;
    width: 100%;
    overflow: hidden;
  }

  .message__links {
    display: grid;
    grid-gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, 25rem);
    min-height: 2.5rem;
    width: 100%;
    overflow: hidden;
  }
</style>
