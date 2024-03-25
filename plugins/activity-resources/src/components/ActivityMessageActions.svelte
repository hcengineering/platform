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
  import activity, { ActivityMessage, ActivityMessageExtension } from '@hcengineering/activity'
  import { Action, IconMoreV, showPopup } from '@hcengineering/ui'
  import { Menu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import ActivityMessageAction from './ActivityMessageAction.svelte'
  import PinMessageAction from './PinMessageAction.svelte'
  import SaveMessageAction from './SaveMessageAction.svelte'
  import ActivityMessageExtensionComponent from './activity-message/ActivityMessageExtension.svelte'
  import AddReactionAction from './reactions/AddReactionAction.svelte'

  export let message: ActivityMessage | undefined
  export let extensions: ActivityMessageExtension[] = []
  export let actions: Action[] = []
  export let withActionMenu = true

  const dispatch = createEventDispatcher()

  let isActionMenuOpened = false

  function handleActionMenuOpened (): void {
    isActionMenuOpened = true
    dispatch('open')
  }

  function handleActionMenuClosed (): void {
    isActionMenuOpened = false
    dispatch('close')
  }

  function showMenu (ev: MouseEvent): void {
    showPopup(
      Menu,
      {
        object: message,
        actions,
        baseMenuClass: activity.class.ActivityMessage
      },
      ev.target as HTMLElement,
      handleActionMenuClosed
    )
    handleActionMenuOpened()
  }
</script>

{#if message}
  <div class="root">
    <AddReactionAction object={message} on:open on:close />
    <ActivityMessageExtensionComponent kind="action" {extensions} props={{ object: message }} on:close on:open />
    <PinMessageAction object={message} />
    <SaveMessageAction object={message} />

    {#if withActionMenu}
      <ActivityMessageAction size="small" icon={IconMoreV} opened={isActionMenuOpened} action={showMenu} />
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
