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
  import { ButtonIcon, IconMoreV, showPopup, Action, getEventPositionElement, Menu } from '@hcengineering/ui'
  import { MessageAction } from '@hcengineering/communication'
  import { getResource } from '@hcengineering/platform'
  import { Message } from '@hcengineering/communication-types'
  import { Card } from '@hcengineering/card'
  import view from '@hcengineering/view'

  export let message: Message
  export let card: Card
  export let actions: MessageAction[]
  export let onClose: () => void
  export let onOpen: () => void

  let menuActions: MessageAction[] = []
  let inlineActions: MessageAction[] = []

  $: menuActions = actions.filter((a) => a.menu)
  $: inlineActions = actions.filter((a) => !(a.menu ?? false))

  async function handleAction (action: MessageAction, ev: MouseEvent): Promise<void> {
    const actionFn = await getResource(action.action)
    await actionFn(message, card, ev, onOpen, onClose)
  }

  function showMenu (ev: MouseEvent): void {
    onOpen()

    const actions: Action[] = menuActions.map((action) => ({
      id: action._id,
      label: action.label,
      icon: action.icon,
      action: async () => {
        await handleAction(action, ev)
      }
    }))

    showPopup(Menu, { actions }, getEventPositionElement(ev), onClose)
  }
</script>

<div class="message-actions-panel">
  {#each inlineActions as action}
    {#if action.icon}
      <ButtonIcon
        icon={action.icon}
        iconSize="small"
        size="small"
        kind="tertiary"
        tooltip={{ label: action.label, direction: 'bottom' }}
        on:click={(ev) => handleAction(action, ev)}
      />
    {/if}
  {/each}

  {#if menuActions.length > 0}
    <ButtonIcon
      icon={IconMoreV}
      iconSize="small"
      size="small"
      kind="tertiary"
      tooltip={{ label: view.string.MoreActions, direction: 'bottom' }}
      on:click={showMenu}
    />
  {/if}
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
