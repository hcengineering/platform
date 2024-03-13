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
  import { Action, ButtonIcon, IconDropdownDown, IconDropdownRight, Menu, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let header: string
  export let actions: Action[] = []
  export let isCollapsed = false

  const dispatch = createEventDispatcher()

  function handleMenuClicked (ev: MouseEvent): void {
    if (actions.length === 0) {
      return
    }
    showPopup(Menu, { actions }, ev.target as HTMLElement)
  }
</script>

<div class="root">
  <ButtonIcon
    size="extra-small"
    kind="tertiary"
    inheritColor
    icon={isCollapsed ? IconDropdownRight : IconDropdownDown}
    on:click={() => dispatch('collapse')}
  />

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="header uppercase" class:disabled={actions.length === 0} on:click={handleMenuClicked}>
    {header}
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    border-radius: 0.375rem;
    padding-right: 0.25rem;
    color: var(--global-secondary-TextColor);
    font-size: 0.75rem;
  }

  .header {
    cursor: pointer;
    padding: var(--spacing-0_5) var(--spacing-0_75);
    border-radius: var(--extra-small-BorderRadius);
    background-color: var(--global-ui-BackgroundColor);
    width: fit-content;
    margin: 0.5rem 0.25rem;

    &.disabled {
      cursor: default;
    }

    &:hover:not(.disabled) {
      color: var(--global-primary-TextColor);
      background-color: var(--global-ui-highlight-BackgroundColor);
    }
  }
</style>
