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
  import { Label, Lazy } from '../../index'
  import EmojiGroupPalette from './EmojiGroupPalette.svelte'
  import { resultEmojis, EmojiWithGroup, EmojiCategory } from '.'

  import plugin from '../../plugin'

  export let group: EmojiCategory
  export let lazy: boolean = true
  export let searching: boolean = false
  export let disabled: boolean = false
  export let selected: string | undefined = undefined
  export let skinTone: number = 0
  export let kind: 'default' | 'fade' = 'fade'

  let emojis: EmojiWithGroup[] = []
  $: emojis = searching
    ? $resultEmojis
    : Array.isArray(group.emojis)
      ? group.emojis
      : $resultEmojis.filter((re) => re.key === group.id)
</script>

<div class="hulyPopupEmoji-group kind-{kind}" class:lazy>
  <div id={group.id} class="hulyPopupEmoji-group__header categoryHeader">
    <Label label={searching && $resultEmojis.length === 0 ? plugin.string.NoResults : group.label} />
  </div>
  {#if lazy}
    <Lazy>
      <EmojiGroupPalette {emojis} {disabled} {selected} {skinTone} on:select on:touchstart on:contextmenu />
    </Lazy>
  {:else}
    <EmojiGroupPalette {emojis} {disabled} {selected} {skinTone} on:select on:touchstart on:contextmenu />
  {/if}
</div>

<style lang="scss">
  .hulyPopupEmoji-group {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    min-width: 0;
    min-height: 0;

    &.lazy {
      min-height: 10rem;
    }

    &__header {
      position: sticky;
      flex-shrink: 0;
      margin: 0.75rem 0.75rem 0.25rem;
      padding: 0.25rem 0.375rem;
      top: 0;
      height: 1.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      text-shadow: 0 0 0.25rem var(--theme-popup-color);
      color: var(--theme-caption-color);
      border-radius: 0.25rem;
      z-index: 1;
      pointer-events: none;

      &:first-child {
        margin-top: 0;
      }
      &::before {
        content: '';
        position: absolute;
        top: -1px;
        left: 0;
        width: 100%;
        height: 150%;
        background: var(--theme-popup-trans-gradient);
        z-index: -1;
      }
    }

    &.kind-default {
      .hulyPopupEmoji-group__header {
        background: var(--theme-popup-header);

        &::before {
          content: none;
        }
      }
    }
  }
</style>
