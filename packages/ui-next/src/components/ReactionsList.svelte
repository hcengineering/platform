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

  import Reaction from './Reaction.svelte'
  import IconEmojiAdd from './icons/IconEmojiAdd.svelte'
  import { ReactionType } from '../types'

  export let reactions: ReactionType[] = []

  const dispatch = createEventDispatcher()

  let emojiPopupOpened = false

  function handleAdd (event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    emojiPopupOpened = true
    showPopup(
      EmojiPopup,
      {},
      event.target as HTMLElement,
      (emoji) => {
        emojiPopupOpened = false
        if (emoji === null || emoji === undefined) {
          return
        }
        dispatch('click', emoji)
      },
      () => {}
    )
  }
</script>

<div class="reactions">
  {#each reactions as reaction (reaction.id)}
    <Reaction
      emoji={reaction.emoji}
      selected={reaction.selected}
      count={reaction.count}
      on:click={() => dispatch('click', reaction.emoji)}
    />
  {/each}
  <Reaction icon={IconEmojiAdd} iconSize="small" active={emojiPopupOpened} on:click={handleAdd} />
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
