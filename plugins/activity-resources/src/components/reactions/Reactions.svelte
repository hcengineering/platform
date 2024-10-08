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
  import { Account, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import { EmojiPopup, IconAdd, showPopup, tooltip } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'

  import ReactionsTooltip from './ReactionsTooltip.svelte'
  import { updateDocReactions } from '../../utils'

  export let reactions: Reaction[] = []
  export let object: Doc | undefined = undefined
  export let readonly: boolean = false

  const dispatch = createEventDispatcher()
  const me = getCurrentAccount()

  let reactionsAccounts = new Map<string, Ref<Account>[]>()

  $: {
    reactionsAccounts.clear()
    reactions.forEach((r) => {
      const accounts = reactionsAccounts.get(r.emoji) ?? []
      reactionsAccounts.set(r.emoji, [...accounts, r.createBy])
    })
    reactionsAccounts = reactionsAccounts
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
    showPopup(EmojiPopup, {}, ev.target as HTMLElement, async (emoji: string) => {
      await updateDocReactions(reactions, object, emoji)
    })
  }
</script>

<div class="container">
  {#each [...reactionsAccounts] as [emoji, accounts]}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="item border-radius-1"
      class:highlight={accounts.includes(me._id)}
      class:cursor-pointer={!readonly}
      use:tooltip={{ component: ReactionsTooltip, props: { reactionAccounts: accounts } }}
      on:click={getClickHandler(emoji)}
    >
      <div class="flex-row-center">
        {emoji}
        <div class="caption-color counter">{accounts.length}</div>
      </div>
    </div>
  {/each}
  {#if object && reactionsAccounts.size > 0 && !readonly}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="item flex-row-center border-radius-1" class:withoutBackground={true} on:click={openEmojiPalette}>
      <IconAdd size="small" />
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-wrap: wrap;
    user-select: none;
    column-gap: 0.125rem;
    row-gap: 0.25rem;
  }

  .counter {
    font-size: 0.75rem;
    color: var(--global-secondary-TextColor);
    margin-left: 0.25rem;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.625rem;
    height: 1.5rem;
    background: var(--button-disabled-BackgroundColor);
    border: none;
    cursor: pointer;

    &.highlight {
      background: var(--global-ui-highlight-BackgroundColor);
      border: 1px solid var(--global-accent-BackgroundColor);
    }

    &:hover {
      background: var(--global-ui-highlight-BackgroundColor);
      border: 1px solid var(--global-popover-ShadowColor);

      &.highlight {
        border: 1px solid var(--global-accent-BackgroundColor);
      }
    }

    &.withoutBackground {
      background: transparent;

      &:hover {
        background: var(--global-ui-highlight-BackgroundColor);
      }
    }
  }
</style>
