<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher } from 'svelte'
  import type { Emoji } from 'emojibase'
  import { generateSkinToneEmojis, getEmojiCode, type EmojiWithGroup } from '.'
  import { ButtonBase, closeTooltip } from '../..'

  export let emoji: number | number[] | string | Emoji | EmojiWithGroup
  export let selected: number

  const dispatch = createEventDispatcher()

  const skins: string[] = generateSkinToneEmojis(getEmojiCode(emoji))
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
      <span style:font-size={'1.5rem'}>{skin}</span>
    </ButtonBase>
  {/each}
</div>
