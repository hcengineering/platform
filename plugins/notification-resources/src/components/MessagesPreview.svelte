<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import chunter, { ChunterMessage, DirectMessage } from '@hcengineering/chunter'
  import attachment from '@hcengineering/attachment'
  import MessagePreview from './MessagePreview.svelte'

  export let channel: Ref<DirectMessage>
  export let numOfMessages: number

  const NUM_OF_RECENT_MESSAGES = 5 as const

  let messages: ChunterMessage[] = []
  const messagesQuery = createQuery()
  $: messagesQuery.query(chunter.class.ChunterMessage, { attachedTo: channel },
    (res) => {
      if (res !== undefined) {
        messages = res.sort((a, b) => (a.createdOn ?? 0) - (b.createdOn ?? 0))
      }
    },
    {
      limit: numOfMessages || NUM_OF_RECENT_MESSAGES,
      sort: {
        createdOn: SortingOrder.Descending
      },
      lookup: {
        _id: { attachments: attachment.class.Attachment }
      }
    })
</script>

<div class="flex-col flex-gap-3 preview-container">
  {#each messages as message}
    <MessagePreview {message} />
  {/each}
</div>

<style lang="scss">
  .preview-container {
    padding: 0.5rem;
    background-color: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
  }
</style>
