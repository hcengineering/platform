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
  import {
    Action,
    ActionIcon,
    AnySvelteComponent,
    Icon,
    IconMoreH,
    IconRight,
    IconSize,
    Label,
    Menu,
    showPopup
  } from '@hcengineering/ui'
  import { NotifyMarker } from '@hcengineering/notification-resources'
  import { Asset, IntlString } from '@hcengineering/platform'

  export let id: string
  export let icon: Asset | AnySvelteComponent | undefined
  export let iconProps: any | undefined = undefined
  export let iconSize: IconSize = 'x-small'
  export let iconPadding: string | null = null
  export let padding: string | null = null
  export let withIconBackground = true
  export let isSelected = false
  export let isSecondary = false
  export let notificationsCount = 0
  export let title: string | undefined = undefined
  export let intlTitle: IntlString | undefined = undefined
  export let description: string | undefined = undefined
  export let actions: Action[] = []
  export let elementsCount = 0

  let menuOpened = false
  let inlineActions: Action[] = []
  let menuActions: Action[] = []

  $: inlineActions = actions.filter(({ inline }) => inline === true)
  $: menuActions = actions.filter(({ inline }) => inline !== true)

  function handleMenuClicked (ev: MouseEvent): void {
    showPopup(Menu, { actions: menuActions, ctx: id }, ev.target as HTMLElement, () => {
      menuOpened = false
    })
    menuOpened = true
  }

  async function handleInlineActionClicked (ev: MouseEvent, action: Action): Promise<void> {
    await action.action([], ev)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="root" class:pressed={menuOpened || isSelected} style:padding on:click>
  {#if icon}
    <div class="icon" class:withBackground={withIconBackground} style:padding={iconPadding}>
      <Icon
        {icon}
        {iconProps}
        size={iconSize}
        fill={isSelected ? 'var(--theme-link-color)' : 'var(--global-primary-TextColor)'}
      />
    </div>
  {/if}

  <div class="content">
    <span
      class="label overflow-label"
      class:secondary={isSecondary}
      class:extraBold={notificationsCount > 0}
      class:selected={isSelected}
      style="flex-shrink: 0"
    >
      {#if title}
        {title}
      {:else if intlTitle}
        <Label label={intlTitle} />
      {/if}
      {#if description}
        <span class="label overflow-label ml-1-5" title={description}>
          {description}
        </span>
      {/if}
    </span>
  </div>

  <div class="grower" />

  <div class="controls">
    <div class="flex-center">
      {#each inlineActions as action}
        <div
          class="action"
          class:pressed={menuOpened}
          on:click|preventDefault|stopPropagation={(ev) => handleInlineActionClicked(ev, action)}
        >
          <Icon icon={action.icon ?? ActionIcon} size="small" />
        </div>
      {/each}
      {#if menuActions.length > 0}
        <div class="action" class:pressed={menuOpened} on:click|preventDefault|stopPropagation={handleMenuClicked}>
          <IconMoreH size={'small'} />
        </div>
      {/if}
      {#if elementsCount > 0}
        <div class="ml-2" />
        <div class="elementsCounter">{elementsCount}</div>
      {/if}
      {#if notificationsCount > 0}
        <div class="ml-2" />
        <NotifyMarker count={notificationsCount} />
      {/if}
      {#if isSelected}
        <div class="ml-2" />
        <IconRight size="small" fill="var(--theme-link-color)" />
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    padding: var(--spacing-0_5) var(--spacing-0_5);
    border-radius: var(--small-BorderRadius);
    cursor: pointer;
    position: relative;

    &:hover {
      background-color: var(--global-ui-highlight-BackgroundColor);

      .action {
        visibility: visible;
      }
    }

    &.pressed {
      background-color: var(--global-ui-highlight-BackgroundColor);
    }

    .action {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 0.25rem;
      flex-shrink: 0;
      margin-left: 0.5rem;
      visibility: hidden;

      &:hover,
      &.pressed {
        visibility: visible;
        color: var(--global-primary-TextColor);
        background-color: var(--global-ui-highlight-BackgroundColor);
      }
    }
  }

  .grower {
    flex-grow: 1;
    min-width: 0;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 0.375rem;
    color: var(--global-primary-TextColor);

    &.withBackground {
      background: var(--global-ui-BackgroundColor);
      width: 1.5rem;
      height: 1.5rem;
      border-radius: var(--extra-small-BorderRadius);
      border: 1px solid var(--global-subtle-ui-BorderColor);
    }
  }

  .label {
    font-size: 0.875rem;
    color: var(--global-primary-TextColor);
    font-weight: 400;

    &.secondary {
      font-size: 0.75rem;
      font-weight: 500;
    }

    &.extraBold {
      font-weight: 700;
    }

    &.selected {
      color: var(--global-accent-TextColor);
    }
  }

  .controls {
    display: flex;
    height: 100%;
    align-items: flex-start;
  }

  .content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    justify-content: center;
    max-height: 3.75rem;
  }

  .elementsCounter {
    color: var(--global-tertiary-TextColor);
    font-size: 0.75rem;
  }
</style>
