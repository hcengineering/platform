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
  import { createEventDispatcher } from 'svelte'
  import { EmojiPopup, showPopup } from '@hcengineering/ui'
  import { getCurrentAccount, groupByArray } from '@hcengineering/core'
  import { Reaction } from '@hcengineering/communication-types'

  import ReactionPresenter from './ReactionPresenter.svelte'
  import IconEmojiAdd from './icons/IconEmojiAdd.svelte'

  export let reactions: Reaction[] = []

  const dispatch = createEventDispatcher()
  const me = getCurrentAccount()

  let emojiPopupOpened = false

  function handleAdd (event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    emojiPopupOpened = true
    showPopup(
      EmojiPopup,
      {},
      event.target as HTMLElement,
      (result) => {
        const emoji = result?.emoji
        emojiPopupOpened = false
        if (emoji == null) {
          return
        }
        dispatch('click', emoji)
      },
      () => {}
    )
  }

  let reactionsByEmoji = new Map<string, Reaction[]>()
  $: reactionsByEmoji = groupByArray(reactions, (it) => it.reaction)
</script>

<div class="reactions">
  {#each reactionsByEmoji as [emoji, reactions] (emoji)}
    <ReactionPresenter
      {emoji}
      selected={reactions.some((it) => me.socialIds.includes(it.creator))}
      count={reactions.length}
      on:click={() => dispatch('click', emoji)}
    />
  {/each}
  <ReactionPresenter icon={IconEmojiAdd} iconSize="small" active={emojiPopupOpened} on:click={handleAdd} />
</div>

<style lang="scss">
  .reactions {
    display: flex;
    align-items: center;
    align-content: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }
</style>
