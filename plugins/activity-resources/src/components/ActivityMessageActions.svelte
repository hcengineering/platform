<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { Action, IconMoreV, showPopup } from '@hcengineering/ui'
  import { getActions, Menu } from '@hcengineering/view-resources'
  import { getClient } from '@hcengineering/presentation'
  import { getResource } from '@hcengineering/platform'
  import view, { Action as ViewAction } from '@hcengineering/view'

  import ActivityMessageAction from './ActivityMessageAction.svelte'
  import { savedMessagesStore } from '../activity'

  export let message: ActivityMessage | undefined
  export let actions: Action[] = []
  export let withActionMenu = true
  export let onOpen: () => void
  export let onClose: () => void

  const client = getClient()

  let inlineActions: ViewAction[] = []
  let isActionMenuOpened = false

  $: void updateInlineActions(message)

  savedMessagesStore.subscribe(() => {
    void updateInlineActions(message)
  })

  function handleActionMenuOpened (): void {
    isActionMenuOpened = true
    onOpen()
  }

  function handleActionMenuClosed (): void {
    isActionMenuOpened = false
    onClose()
  }

  function showMenu (ev: MouseEvent): void {
    const excludedActions = inlineActions.map(({ _id }) => _id)

    showPopup(
      Menu,
      {
        object: message,
        actions,
        baseMenuClass: activity.class.ActivityMessage,
        excludedActions
      },
      ev.target as HTMLElement,
      handleActionMenuClosed
    )
    handleActionMenuOpened()
  }

  async function updateInlineActions (message?: ActivityMessage): Promise<void> {
    if (message === undefined) {
      inlineActions = []
      return
    }
    inlineActions = (await getActions(client, message, activity.class.ActivityMessage)).filter(
      (action) => action.inline
    )
  }
</script>

{#if message}
  <div class="root">
    {#each inlineActions as inline}
      {#if inline.icon}
        {#await getResource(inline.action) then action}
          <ActivityMessageAction
            label={inline.label}
            size={inline.actionProps?.size ?? 'small'}
            icon={inline.icon}
            iconProps={inline.actionProps?.iconProps}
            action={(ev) => action(message, ev, { onOpen, onClose })}
          />
        {/await}
      {/if}
    {/each}

    {#if withActionMenu}
      <ActivityMessageAction
        size="small"
        icon={IconMoreV}
        opened={isActionMenuOpened}
        action={showMenu}
        label={view.string.MoreActions}
      />
    {/if}
  </div>
{/if}

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
    border-radius: 0.375rem;
    border: 1px solid var(--global-subtle-ui-BorderColor);
    padding: 0.125rem;
    background: var(--global-surface-01-BackgroundColor);
    box-shadow: 0.5rem 0.75rem 1rem 0.25rem var(--global-popover-ShadowColor);
    height: fit-content;
  }
</style>
