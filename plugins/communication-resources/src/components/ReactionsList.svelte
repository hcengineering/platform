<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { showPopup } from '@hcengineering/ui'
  import { getCurrentAccount } from '@hcengineering/core'
  import { Emoji, EmojiData } from '@hcengineering/communication-types'
  import emojiPlugin from '@hcengineering/emoji'

  import ReactionPresenter from './ReactionPresenter.svelte'

  export let reactions: Record<Emoji, EmojiData[]> = {}

  const dispatch = createEventDispatcher()
  const me = getCurrentAccount()

  let emojiPopupOpened = false

  function handleAdd (event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    emojiPopupOpened = true
    showPopup(
      emojiPlugin.component.EmojiPopup,
      {},
      event.target as HTMLElement,
      (result) => {
        const emoji = result?.text
        emojiPopupOpened = false
        if (emoji == null) {
          return
        }
        dispatch('click', emoji)
      },
      () => {}
    )
  }
</script>

<div class="reactions">
  {#each Object.entries(reactions) as [emoji, data] (emoji)}
    {#if data.length > 0}
    <ReactionPresenter
      {emoji}
      selected={data.some((it) => it.person === me.uuid)}
      persons={data.map((it) => it.person)}
      count={data.length}
      on:click={() => dispatch('click', emoji)}
    />
      {/if}
  {/each}
  <ReactionPresenter icon={emojiPlugin.icon.EmojiAdd} iconSize="small" active={emojiPopupOpened} on:click={handleAdd} />
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
