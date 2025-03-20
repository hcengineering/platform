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
  import type { EmojiWithGroup } from '.'

  import EmojiButton from './EmojiButton.svelte'

  export let emojis: EmojiWithGroup[]
  export let selected: string | undefined
  export let disabled: boolean = false
  export let skinTone: number = 0

  const dispatch = createEventDispatcher()
</script>

<div class="hulyPopupEmoji-group__palette">
  {#each emojis as emoji}
    <EmojiButton
      {emoji}
      selected={emoji.emoji === selected}
      {disabled}
      {skinTone}
      on:select
      on:touchstart={(event) => {
        dispatch('touchstart', { event, emoji })
      }}
      on:contextmenu={(event) => {
        dispatch('contextmenu', { event, emoji })
      }}
    />
  {/each}
  <div class="clear-mins flex-grow" />
</div>

<style lang="scss">
  .hulyPopupEmoji-group__palette {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    flex-shrink: 0;
    margin-inline: 0.75rem;
    font-size: 1.25rem;
  }
</style>
