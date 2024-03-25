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
  import activity, { ActivityMessage, Reaction } from '@hcengineering/activity'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { EmojiPopup, showPopup } from '@hcengineering/ui'
  import { SortingOrder } from '@hcengineering/core'

  import { updateDocReactions } from '../../utils'

  export let message: ActivityMessage | undefined
  export let readonly = false

  const maxPreviewReactions = 3

  const client = getClient()
  const reactionsQuery = createQuery()

  let reactions: Reaction[] = []
  let emojis: string[] = []

  $: hasReactions = message?.reactions && message.reactions > 0

  $: if (message && hasReactions) {
    reactionsQuery.query(
      activity.class.Reaction,
      { attachedTo: message._id },
      (res: Reaction[]) => {
        reactions = res

        const result: string[] = []
        for (const reaction of res) {
          if (!result.includes(reaction.emoji)) {
            result.push(reaction.emoji)
          }
        }

        emojis = result
      },
      {
        sort: {
          createdOn: SortingOrder.Descending
        }
      }
    )
  } else {
    reactionsQuery.unsubscribe()
  }

  function handleClick (e: MouseEvent): void {
    if (readonly) return

    e.stopPropagation()
    e.preventDefault()
    showPopup(EmojiPopup, {}, e.target as HTMLElement, (emoji: string) => {
      void updateDocReactions(client, reactions, message, emoji)
    })
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<span class="preview" on:click={handleClick}>
  {#each emojis.slice(0, maxPreviewReactions) as emoji}
    {emoji}
  {/each}
</span>

<style lang="scss">
  .preview {
    cursor: pointer;
    white-space: nowrap;
    margin-left: 0.5rem;
  }
</style>
