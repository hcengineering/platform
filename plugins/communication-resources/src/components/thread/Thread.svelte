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
  import { createQuery } from '@hcengineering/presentation'
  import { Thread } from '@hcengineering/communication-types'
  import cardPlugin, { Card } from '@hcengineering/card'

  import ThreadCollaborators from './ThreadCollaborators.svelte'
  import ThreadRepliesCount from './ThreadRepliesCount.svelte'
  import ThreadLastReply from './ThreadLastReply.svelte'
  import ThreadTags from './ThreadTags.svelte'
  import ThreadTitle from './ThreadTitle.svelte'

  export let thread: Thread
  const threadCardQuery = createQuery()

  let threadCard: Card | undefined

  $: if (thread?.threadId !== undefined) {
    threadCardQuery.query(
      cardPlugin.class.Card,
      { _id: thread.threadId },
      (res) => {
        threadCard = res[0]
      },
      { limit: 1 }
    )
  } else {
    threadCard = undefined
    threadCardQuery.unsubscribe()
  }

  $: if (thread?.threadId !== threadCard?._id) {
    threadCard = undefined
  }
  let clientWidth = 0
</script>

<div class="replies-container flex-grow" bind:clientWidth>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="replies" on:click style:max-width={`${clientWidth}px`}>
    <ThreadCollaborators threadId={thread.threadId} />

    {#if thread.repliesCount > 0}
      <span class="text overflow-label">
        <ThreadRepliesCount count={thread.repliesCount} />
        <ThreadLastReply lastReply={thread.lastReply} />
      </span>
    {/if}

    {#if threadCard && clientWidth > 300}
      <ThreadTags card={threadCard} />
    {/if}

    {#if threadCard && clientWidth > 300}
      <ThreadTitle title={threadCard.title} />
    {/if}
  </div>
</div>

<style lang="scss">
  .replies-container {
    display: flex;
    flex-shrink: 1;
    min-width: 0;
    min-height: 2.375rem;
    height: 2.375rem;
  }
  .replies {
    display: flex;
    padding: 0.5rem 0.5rem;
    align-items: center;
    gap: 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    min-width: 0;
    border: 1px solid var(--global-ui-BorderColor);
    min-height: 2.375rem;
    height: 2.375rem;

    &:hover {
      background-color: var(--theme-bg-color);
    }
  }

  .text {
    flex: 1 1 auto;
  }
</style>
