<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher } from 'svelte'
  import { type EmojiWithGroup } from '.'
  import { ButtonBase, closeTooltip } from '../..'
  import { Emoji } from 'emojibase'

  export let emoji: EmojiWithGroup
  export let selected: number

  const dispatch = createEventDispatcher()

  const skins: Emoji[] = emoji.skins ?? []
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
      <span style:font-size={'1.5rem'}>{skin.emoji}</span>
    </ButtonBase>
  {/each}
</div>
