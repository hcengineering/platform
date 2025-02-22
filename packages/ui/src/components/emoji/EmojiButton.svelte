<script lang="ts">
  //
  // © 2025 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import { createEventDispatcher } from 'svelte'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { tooltip, capitalizeFirstLetter, type EmojiWithGroup, type LabelAndProps } from '../../'
  import { getEmoji } from '.'
  import { type Emoji } from 'emojibase'

  export let emoji: EmojiWithGroup
  export let selected: boolean = false
  export let disabled: boolean = false
  export let preview: boolean = false
  export let skinTone: number = 0
  export let showTooltip: LabelAndProps | undefined = undefined

  const dispatch = createEventDispatcher()

  const getSkinsCount = (e: Emoji | EmojiWithGroup): number | undefined => {
    return Array.isArray(e.skins) ? e.skins.length : undefined
  }

  let displayedEmoji: Emoji | EmojiWithGroup
  $: _emoji = (getSkinsCount(emoji) ?? 0) > 0 ? emoji : getEmoji(emoji.hexcode)?.parent ?? emoji
  $: skinIndex = _emoji?.skins?.findIndex((skin) => skin.tone === skinTone) ?? -1
  $: displayedEmoji = skinTone > 0 && Array.isArray(_emoji.skins) && skinIndex > -1 ? _emoji.skins[skinIndex] : _emoji
</script>

{#if emoji}
  <button
    use:tooltip={showTooltip ?? { label: getEmbeddedLabel(capitalizeFirstLetter(displayedEmoji?.label ?? '')) }}
    class="hulyPopupEmoji-button"
    class:preview
    class:selected
    class:skins={_emoji?.skins !== undefined}
    data-skins={getSkinsCount(_emoji)}
    {disabled}
    on:touchstart
    on:contextmenu
    on:click={() => {
      if (disabled) return
      dispatch('select', displayedEmoji)
    }}
  >
    <span>{displayedEmoji.emoji}</span>
  </button>
{/if}

<style lang="scss">
  .hulyPopupEmoji-button {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    line-height: 150%;
    color: var(--theme-content-color);

    &:not(.preview) {
      margin: 0.125rem;
      padding: 0.25rem;
      width: 2.75rem;
      height: 2.75rem;
      font-size: 2rem;
      border-radius: 0.75rem;
    }
    &.preview {
      margin: 0;
      padding: 0;
      width: 2.25rem;
      height: 2.25rem;
      font-size: 1.75rem;
      border-radius: 0.375rem;
    }
    span {
      transform: translateY(1%);
      pointer-events: none;
    }
    &:enabled:hover {
      color: var(--theme-caption-color);
      background-color: var(--theme-popup-hover);
    }

    &.selected {
      background-color: var(--theme-popup-header);
      border: 1px solid var(--theme-popup-divider);
    }

    :global(.mobile-theme) & {
      width: 2rem;
      height: 2rem;
      font-size: 1.5rem;
      border-radius: 0.25rem;
    }

    &.skins:not(.preview) {
      position: relative;
      border: 1px dashed var(--theme-button-border);

      &:hover {
        &::before {
          content: '';
          position: absolute;
          top: -0.25rem;
          right: -0.25rem;
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          background-color: var(--global-focus-BorderColor);
        }
        &::after {
          content: attr(data-skins);
          position: absolute;
          top: 0.25rem;
          right: 0.25rem;
          font-size: 0.625rem;
          font-weight: 700;
          color: #fff;
          transform: translate(50%, -50%);
        }
      }
    }
  }
</style>
