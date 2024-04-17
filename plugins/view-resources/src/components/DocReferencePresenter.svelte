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
  import type { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import view, { AttributeModel } from '@hcengineering/view'
  import { Component, Icon, IconSize } from '@hcengineering/ui'
  import contact from '@hcengineering/contact'

  import { classIcon, getObjectPresenter } from '../utils'

  export let value: Doc | undefined
  export let compact = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let presenter: AttributeModel | undefined
  let size: IconSize = 'small'

  $: if (value !== undefined) {
    void getObjectPresenter(client, value._class, { key: '' }).then((result) => {
      presenter = result
    })
  }

  $: iconMixin = value && hierarchy.classHierarchyMixin(value._class, view.mixin.ObjectIcon)

  $: if (value && hierarchy.isDerived(value._class, contact.class.Person)) {
    size = 'tiny'
  } else {
    size = 'small'
  }
</script>

<button class="reference flex-row-top flex-no-shrink flex-gap-2" class:compact on:click>
  <span class="label overflow-label font-medium-12 text-left secondary-textColor">
    <slot name="prefix" />
  </span>
  <div class="icon">
    {#if iconMixin && value}
      <Component is={iconMixin.component} props={{ value, size }} />
    {:else if !iconMixin && value}
      <Icon icon={classIcon(client, value._class) ?? view.icon.Views} {size} />
    {/if}
  </div>
  <span class="label overflow-label font-medium-12 text-left max-w-20 secondary-textColor">
    {#if presenter && value}
      <svelte:component
        this={presenter.presenter}
        {value}
        embedded
        shouldShowAvatar={false}
        noUnderline
        disabled
        colorInherit
        type="text"
      />
    {/if}
  </span>
  <slot />
</button>

<style lang="scss">
  .reference {
    padding: 0 var(--spacing-1) 0 0;
    box-shadow: inset 0 0 0 1px var(--global-subtle-ui-BorderColor);
    border-radius: var(--extra-small-BorderRadius);
    background-color: var(--tag-nuance-SkyBackground);

    &.compact {
      gap: var(--spacing-0_5);
    }

    &:hover {
      box-shadow: inset 0 0 0 1px var(--global-ui-BorderColor);
    }
  }

  .icon {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    height: var(--global-extra-small-Size);
  }

  .label {
    flex-grow: 1;
    flex-shrink: 1;
    padding-top: var(--spacing-0_5);
    color: var(--global-secondary-TextColor);

    &:not(.large) {
      height: var(--global-extra-small-Size);
    }
  }
</style>
