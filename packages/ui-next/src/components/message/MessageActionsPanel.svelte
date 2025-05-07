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
  import { showPopup } from '@hcengineering/ui'
  import { Message } from '@hcengineering/communication-types'
  import { createEventDispatcher } from 'svelte'
  import emojiPlugin from '@hcengineering/emoji'

  import IconEmoji from '../icons/IconEmoji.svelte'
  import IconMessageMultiple from '../icons/IconMessageMultiple.svelte'
  import IconPen from '../icons/IconPen.svelte'
  import uiNext from '../../plugin'
  import { toggleReaction } from '../../utils'
  import { Action } from '../../types'
  import Button from '../Button.svelte'

  export let message: Message
  export let editable: boolean = true
  export let isOpened: boolean = false

  const dispatch = createEventDispatcher()

  function getActions (): Action[] {
    const actions: Action[] = [
      {
        id: 'emoji',
        label: uiNext.string.Emoji,
        icon: IconEmoji,
        order: 10,
        action: (event: MouseEvent): void => {
          isOpened = true
          showPopup(
            emojiPlugin.component.EmojiPopup,
            {},
            event.target as HTMLElement,
            async (result) => {
              isOpened = false
              const emoji = result?.text
              if (emoji == null) {
                return
              }

              await toggleReaction(message, emoji)
            },
            () => {
              isOpened = false
            }
          )
        }
      },
      {
        id: 'reply',
        label: uiNext.string.Reply,
        icon: IconMessageMultiple,
        order: 20,
        action: (): void => {
          dispatch('reply')
        }
      }
    ]

    if (editable) {
      actions.unshift({
        id: 'edit',
        label: uiNext.string.Edit,
        icon: IconPen,
        order: 30,
        action: () => {
          dispatch('edit')
        }
      })
    }

    return actions.sort((a, b) => a.order - b.order)
  }

  const actions: Action[] = getActions()
</script>

<div class="message-actions-panel">
  {#each actions as action (action.id)}
    <Button icon={action.icon} iconSize="medium" tooltip={{ label: action.label }} on:click={action.action} />
  {/each}
</div>

<style lang="scss">
  .message-actions-panel {
    display: flex;
    background: var(--next-background-color);
    border: 1px solid var(--next-border-color);
    padding: 0.25rem;
    border-radius: 0.5rem;
    gap: 0.25rem;
    box-shadow: 0.5rem 0.75rem 1rem 0.25rem var(--color-huly-dark-grey-25);
  }
</style>
