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
  import ui, { showPopup, ButtonIcon, IconDelete, IconEdit } from '@hcengineering/ui'
  import { Message } from '@hcengineering/communication-types'
  import { createEventDispatcher } from 'svelte'
  import emojiPlugin from '@hcengineering/emoji'

  import IconMessageMultiple from '../icons/MessageMultiple.svelte'
  import communication from '../../plugin'
  import { toggleReaction } from '../../utils'
  import { Action } from '../../types'

  export let message: Message
  export let editable: boolean = true
  export let canReply: boolean = true
  export let canReact: boolean = true
  export let isOpened: boolean = false
  export let canRemove: boolean = false

  const dispatch = createEventDispatcher()

  function getActions (): Action[] {
    const actions: Action[] = []
    if (canReact) {
      actions.push({
        id: 'emoji',
        label: communication.string.Emoji,

        icon: emojiPlugin.icon.Emoji,
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
      })
    }

    if (canReply) {
      actions.push({
        id: 'reply',
        label: communication.string.Reply,
        icon: IconMessageMultiple,
        order: 20,
        action: (): void => {
          dispatch('reply')
        }
      })
    }

    if (editable) {
      actions.push({
        id: 'edit',
        label: communication.string.Edit,
        icon: IconEdit,
        order: 30,
        action: () => {
          dispatch('edit')
        }
      })
    }

    if (canRemove) {
      actions.push({
        id: 'remove',
        label: ui.string.Remove,
        icon: IconDelete,
        order: 999,
        action: () => {
          dispatch('remove')
        }
      })
    }

    return actions.sort((a, b) => a.order - b.order)
  }

  const actions: Action[] = getActions()
</script>

<div class="message-actions-panel">
  {#each actions as action (action.id)}
    <ButtonIcon
      icon={action.icon}
      iconSize="small"
      size="small"
      kind="tertiary"
      tooltip={{ label: action.label, direction: 'bottom' }}
      on:click={action.action}
    />
  {/each}
</div>

<style lang="scss">
  .message-actions-panel {
    display: flex;
    background: var(--global-surface-01-BackgroundColor);
    border: 1px solid var(--global-subtle-ui-BorderColor);
    padding: 0.125rem;
    border-radius: 0.5rem;
    gap: 0.25rem;
    box-shadow: 0.5rem 0.75rem 1rem 0.25rem var(--global-popover-ShadowColor);
  }
</style>
