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
  import { Ref } from '@hcengineering/core'

  import ActivityMessageAction from './ActivityMessageAction.svelte'
  import { savedMessagesStore } from '../activity'

  export let message: ActivityMessage | undefined
  export let actions: Action[] = []
  export let excludedActions: Ref<ViewAction>[] = []
  export let withActionMenu = true
  export let onOpen: () => void
  export let onClose: () => void
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined

  const client = getClient()

  let inlineActions: ViewAction[] = []
  let isActionMenuOpened = false

  $: void updateInlineActions(message, excludedActions)

  savedMessagesStore.subscribe(() => {
    void updateInlineActions(message, excludedActions)
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
    showPopup(
      Menu,
      {
        object: message,
        actions,
        baseMenuClass: activity.class.ActivityMessage,
        excludedActions: inlineActions.map(({ _id }) => _id).concat(excludedActions)
      },
      ev.target as HTMLElement,
      handleActionMenuClosed
    )
    handleActionMenuOpened()
  }

  async function updateInlineActions (message?: ActivityMessage, excludedAction: Ref<ViewAction>[] = []): Promise<void> {
    if (message === undefined) {
      inlineActions = []
      return
    }
    inlineActions = (await getActions(client, message, activity.class.ActivityMessage))
      .filter((action) => action.inline)
      .filter((action) => !excludedAction.includes(action._id))
  }

  async function handleAction (action: ViewAction, ev?: Event): Promise<void> {
    if (message === undefined) return

    if (onReply !== undefined && action._id === activity.action.Reply) {
      onReply(message)
      handleActionMenuClosed()
      return
    }
    const fn = await getResource(action.action)

    await fn(message, ev, { onOpen, onClose })
  }
</script>

{#if message}
  <div class="activityMessage-actionPopup">
    {#each inlineActions as inline}
      {#if inline.icon}
        <ActivityMessageAction
          label={inline.label}
          size={inline.actionProps?.size ?? 'small'}
          icon={inline.icon}
          iconProps={inline.actionProps?.iconProps}
          dataId={inline._id}
          action={(ev) => handleAction(inline, ev)}
        />
      {/if}
    {/each}

    {#if withActionMenu}
      <ActivityMessageAction
        icon={IconMoreV}
        label={view.string.MoreActions}
        size={'small'}
        opened={isActionMenuOpened}
        dataId={'btnMoreActions'}
        action={showMenu}
      />
    {/if}
  </div>
{/if}

<style lang="scss">
  .activityMessage-actionPopup {
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
