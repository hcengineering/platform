<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher } from 'svelte'
  import { ButtonBase, closeTooltip } from '@hcengineering/ui'

  import { Emoji } from '@hcengineering/emoji'
  import { getEmojiSkins } from '../utils'

  export let emoji: Emoji.Emoji
  export let selected: number

  const dispatch = createEventDispatcher()

  let emojiSkins: Emoji.Emoji[] | undefined
  let skins: Emoji.Emoji[] = []

  $: emojiSkins = getEmojiSkins(emoji)
  $: skins = emojiSkins !== undefined ? [emoji, ...emojiSkins] : []
</script>

<div class="flex-row-center flex-gap-1">
  {#each skins as skin, index}
    {@const disabled = selected === index}
    <ButtonBase
      type={'type-button-icon'}
      {disabled}
      kind={disabled ? 'secondary' : 'tertiary'}
      size={'small'}
      on:click={() => {
        if (disabled) return undefined
        dispatch('update', index)
        closeTooltip()
      }}
    >
      <span style:font-size={'1.5rem'} class="emoji">{skin.emoji}</span>
    </ButtonBase>
  {/each}
</div>
