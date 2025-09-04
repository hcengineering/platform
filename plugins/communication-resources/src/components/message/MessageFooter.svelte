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
  import { AttachmentID, Message, MessageType } from '@hcengineering/communication-types'
  import { getResource } from '@hcengineering/platform'
  import { isAppletAttachment, isBlobAttachment, isLinkPreviewAttachment } from '@hcengineering/communication-shared'
  import { Component } from '@hcengineering/ui'

  import ReactionsList from '../ReactionsList.svelte'
  import MessageThread from '../thread/Thread.svelte'
  import { toggleReaction } from '../../utils'
  import communication from '../../plugin'

  export let message: Message
  export let thread: boolean = true

  const me = getCurrentAccount()
  const communicationClient = getCommunicationClient()
  const client = getClient()

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

  async function removeLinkPreview (id: AttachmentID): Promise<void> {
    await communicationClient.attachmentPatch(message.cardId, message.id, {
      remove: [id]
    })
  }

  const appletsModels = client.getModel().findAllSync(communication.class.Applet, {})
  $: blobs = message.attachments.filter(isBlobAttachment) ?? []
  $: links = message.attachments.filter(isLinkPreviewAttachment) ?? []
  $: applets = message.attachments.filter(isAppletAttachment) ?? []
</script>

{#if applets.length > 0 && !message.removed}
  <div class="message__applets">
    {#each applets as applet (applet.id)}
      {@const appletModel = appletsModels.find((it) => it.type === applet.type)}
      {#if appletModel}
        <Component
          is={appletModel.component}
          props={{
            applet: appletModel,
            attachment: applet
          }}
        />
      {/if}
    {/each}
  </div>
{/if}

{#if blobs.length > 0 && !message.removed}
  <div class="message__files">
    {#each blobs as blob (blob.id)}
      <AttachmentPreview
        value={{
          file: blob.params.blobId,
          type: blob.params.mimeType,
          name: blob.params.fileName,
          size: blob.params.size,
          metadata: blob.params.metadata
        }}
        imageSize="x-large"
      />
    {/each}
  </div>
{/if}
{#if links.length > 0 && !message.removed}
  <div class="message__links">
    {#each links as link (link.id)}
      <LinkPreview
        isOwn={me.socialIds.includes(message.creator)}
        on:delete={() => {
          void removeLinkPreview(link.id)
        }}
        linkPreview={{
          url: link.params.url,
          host: link.params.host,
          title: link.params.title,
          description: link.params.description,
          hostname: link.params.siteName,
          image: link.params.previewImage?.url,
          imageWidth: link.params.previewImage?.width,
          imageHeight: link.params.previewImage?.height,
          icon: link.params.iconUrl
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
{#if thread && message.thread && message.thread.threadId}
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
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
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
