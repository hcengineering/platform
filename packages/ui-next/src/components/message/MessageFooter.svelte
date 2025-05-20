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
  import { getClient } from '@hcengineering/presentation'
  import cardPlugin, { Card } from '@hcengineering/card'
  import { Ref } from '@hcengineering/core'
  import { AttachmentPreview } from '@hcengineering/attachment-resources'
  import { Message, MessageType } from '@hcengineering/communication-types'
  import { openDoc } from '@hcengineering/view-resources'

  import ReactionsList from '../ReactionsList.svelte'
  import MessageReplies from './MessageReplies.svelte'
  import { toggleReaction } from '../../utils'

  export let message: Message
  export let replies: boolean = true
  export let files: boolean = true

  function canReply (): boolean {
    return message.type === MessageType.Message
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
    const _id = t.thread
    const client = getClient()
    const c = await client.findOne(cardPlugin.class.Card, { _id: _id as Ref<Card> })
    if (c === undefined) return
    await openDoc(client.getHierarchy(), c)
  }

  $: isThread = message.thread != null
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if !isThread && message.files.length > 0 && files}
  <div class="message__files">
    {#each message.files as file (file.blobId)}
      <AttachmentPreview
        value={{ file: file.blobId, type: file.type, name: file.filename, size: file.size, metadata: file.meta }}
        imageSize="x-large"
      />
    {/each}
  </div>
{/if}
{#if message.reactions.length > 0}
  <div class="message__reactions">
    <ReactionsList reactions={message.reactions} on:click={handleReaction} />
  </div>
{/if}
{#if replies && message.thread && message.thread.repliesCount > 0}
  <div class="message__replies overflow-label">
    <MessageReplies
      threadId={message.thread.thread}
      count={message.thread.repliesCount}
      lastReply={message.thread.lastReply}
      on:click={handleReply}
    />
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
</style>
