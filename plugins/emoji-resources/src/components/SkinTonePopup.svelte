<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher } from 'svelte'
  import { Label, closeTooltip, ModernCheckbox } from '@hcengineering/ui'
  import { Emoji } from '@hcengineering/emoji'
  import { skinTones } from '../types'
  import { getEmojiSkins } from '../utils'

  export let emoji: Emoji.Emoji
  export let selected: number

  const dispatch = createEventDispatcher()
  closeTooltip()

  const emojiSkins = getEmojiSkins(emoji)
  const skins: Emoji.Emoji[] = emojiSkins !== undefined ? [emoji, ...emojiSkins] : []
</script>

<div class="hulyPopup-container noPadding">
  <div class="hulyPopup-group">
    {#each skins as skin, index}
      {@const disabled = selected === index}
      {@const label = skinTones.get(index)}
      <button
        class="hulyPopup-row withKeys"
        class:noHover={disabled}
        on:click={() => {
          if (disabled) return undefined
          dispatch('close', index)
        }}
      >
        <span style:font-size={'1.5rem'} class="emoji">{skin.emoji}</span>
        {#if label}<span class="hulyPopup-row__label"><Label {label} /></span>{/if}
        {#if disabled}<span class="hulyPopup-row__keys"><ModernCheckbox checked disabled /></span>{/if}
      </button>
    {/each}
  </div>
</div>
