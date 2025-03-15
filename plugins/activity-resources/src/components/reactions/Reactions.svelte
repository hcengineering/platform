<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Reaction } from '@hcengineering/activity'
  import { Doc, getCurrentAccount, PersonId } from '@hcengineering/core'
  import { EmojiPopup, IconAdd, showPopup, tooltip, type Emojis } from '@hcengineering/ui'
  import { includesAny } from '@hcengineering/contact'

  import ReactionsTooltip from './ReactionsTooltip.svelte'
  import { updateDocReactions } from '../../utils'

  export let reactions: Reaction[] = []
  export let object: Doc | undefined = undefined
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()
  const me = getCurrentAccount()

  let reactionsPersons = new Map<string, PersonId[]>()
  let opened: boolean = false

  $: {
    reactionsPersons.clear()
    reactions.forEach((r) => {
      const persons = reactionsPersons.get(r.emoji) ?? []
      reactionsPersons.set(r.emoji, [...persons, r.createBy])
    })
    reactionsPersons = reactionsPersons
  }

  function getClickHandler (emoji: string): ((e: CustomEvent) => void) | undefined {
    if (readonly) return
    return (e: CustomEvent) => {
      e.stopPropagation()
      e.preventDefault()
      dispatch('click', emoji)
    }
  }

  function openEmojiPalette (ev: Event): void {
    if (readonly) return
    ev.preventDefault()
    ev.stopPropagation()
    opened = true
    showPopup(EmojiPopup, {}, ev.target as HTMLElement, async (emoji: Emojis) => {
      if (emoji?.emoji !== undefined) await updateDocReactions(reactions, object, emoji.emoji)
      opened = false
    })
  }
</script>

<div class="hulyReactions-container">
  {#each [...reactionsPersons] as [emoji, persons]}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="hulyReactions-button"
      class:highlight={includesAny(persons, me.socialIds)}
      class:cursor-pointer={!readonly}
      use:tooltip={{ component: ReactionsTooltip, props: { reactionAccounts: persons } }}
      on:click={getClickHandler(emoji)}
    >
      <span class="emoji">{emoji}</span>
      <span class="counter">{persons.length}</span>
    </div>
  {/each}
  {#if object && reactionsPersons.size > 0 && !readonly}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="hulyReactions-button withoutBackground" class:opened on:click={openEmojiPalette}>
      <IconAdd size="small" />
    </div>
  {/if}
</div>

<style lang="scss">
  .hulyReactions-container {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.125rem;
    row-gap: 0.25rem;
    min-width: 0;
    min-height: 0;
    user-select: none;

    .counter {
      font-size: 0.75rem;
      color: var(--global-secondary-TextColor);
      margin-left: 0.25rem;
    }

    .hulyReactions-button {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      padding: 0 0.375rem;
      min-height: 1.5rem;
      color: var(--theme-caption-color);
      background: var(--button-disabled-BackgroundColor);
      border: 1px solid var(--button-secondary-BorderColor);
      border-radius: 0.75rem;
      cursor: pointer;

      .emoji {
        font-size: 1rem;
      }
      &.highlight {
        background: var(--global-ui-highlight-BackgroundColor);
        border-color: var(--global-accent-BackgroundColor);
      }

      &:hover {
        background: var(--global-ui-highlight-BackgroundColor);
        border-color: var(--button-menu-active-BorderColor);

        &.highlight {
          border-color: var(--global-focus-BorderColor);
        }
      }

      &.withoutBackground {
        padding: 0;
        width: 1.5rem;
        background: transparent;
        border-color: transparent;

        &.opened,
        &:hover {
          background: var(--global-ui-highlight-BackgroundColor);
          border-color: var(--button-secondary-BorderColor);
        }
      }
    }
  }
</style>
