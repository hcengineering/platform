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
    type Action,
    ActionIcon,
    type AnySvelteComponent,
    Icon,
    IconMoreH,
    IconSize,
    Menu,
    showPopup,
    NavItem
  } from '@hcengineering/ui'
  import { NotifyMarker } from '@hcengineering/notification-resources'
  import { Asset, IntlString } from '@hcengineering/platform'

  export let _id: string
  export let icon: Asset | AnySvelteComponent | undefined
  export let iconProps: any | undefined = undefined
  export let iconSize: IconSize = 'small'
  export let withIconBackground: boolean = true
  export let isSelected: boolean = false
  export let isSecondary: boolean = false
  export let count: number | null = null
  export let secondaryNotifyMarker: boolean = false
  export let title: string | undefined = undefined
  export let intlTitle: IntlString | undefined = undefined
  export let description: string | undefined = undefined
  export let actions: Action[] = []
  export let elementsCount: number = 0
  export let type: 'type-link' | 'type-tag' | 'type-anchor-link' | 'type-object' = 'type-link'

  let menuOpened = false
  let inlineActions: Action[] = []
  let menuActions: Action[] = []

  $: inlineActions = actions.filter(({ inline }) => inline === true)
  $: menuActions = actions.filter(({ inline }) => inline !== true)

  function handleMenuClicked (ev: MouseEvent): void {
    showPopup(Menu, { actions: menuActions, ctx: _id }, ev.target as HTMLElement, () => {
      menuOpened = false
    })
    menuOpened = true
  }

  async function handleInlineActionClicked (ev: MouseEvent, action: Action): Promise<void> {
    await action.action([], ev)
  }
</script>

<NavItem
  {_id}
  {icon}
  {iconProps}
  {iconSize}
  label={intlTitle}
  {title}
  {description}
  selected={isSelected}
  count={elementsCount > 0 ? elementsCount : null}
  {type}
  withBackground={withIconBackground}
  showMenu={menuOpened}
  on:click
  on:contextmenu
>
  <svelte:fragment slot="actions">
    {#each inlineActions as action}
      <button
        class="action"
        class:pressed={menuOpened}
        on:click|preventDefault|stopPropagation={(ev) => handleInlineActionClicked(ev, action)}
      >
        <Icon icon={action.icon ?? ActionIcon} size="small" />
      </button>
    {/each}
    {#if menuActions.length > 0}
      <button class="action" class:pressed={menuOpened} on:click|preventDefault|stopPropagation={handleMenuClicked}>
        <IconMoreH size={'small'} />
      </button>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="notify">
    {#if count != null && count > 0}
      <div class="antiHSpacer" />
      <div class="notify">
        <NotifyMarker {count} />
      </div>
      <div class="antiHSpacer" />
    {:else if secondaryNotifyMarker}
      <div class="antiHSpacer" />
      <div class="notify">
        <NotifyMarker count={0} kind="simple" size="xx-small" />
      </div>
      <div class="antiHSpacer" />
    {/if}
  </svelte:fragment>
</NavItem>

<style lang="scss">
  .action {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: var(--spacing-0_5);
    color: var(--global-tertiary-TextColor);
    border: none;
    border-radius: var(--extra-small-BorderRadius);
    outline: none;

    &:hover,
    &.pressed {
      color: var(--global-primary-TextColor);
      background-color: var(--global-ui-highlight-BackgroundColor);
    }
  }

  .notify {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
  }
</style>
