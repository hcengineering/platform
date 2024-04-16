<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import {
    AnySvelteComponent,
    Breadcrumbs,
    Button,
    Icon,
    IconClose,
    IconDetails,
    Label,
    SearchEdit
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import view from '@hcengineering/view'
  import { openDoc } from '@hcengineering/view-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Doc, Ref } from '@hcengineering/core'
  import { ActivityMessagesFilter } from '@hcengineering/activity'

  import { userSearch } from '../index'
  import { navigateToSpecial } from '../navigation'
  import ChannelMessagesFilter from './ChannelMessagesFilter.svelte'

  export let object: Doc | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let label: string | undefined = undefined
  export let intlLabel: IntlString | undefined = undefined
  export let description: string | undefined = undefined
  export let allowClose = false
  export let canOpen = false
  export let withAside = false
  export let isAsideShown = false
  export let titleKind: 'default' | 'breadcrumbs' = 'default'
  export let withFilters = false
  export let filters: Ref<ActivityMessagesFilter>[] = []

  const client = getClient()
  const dispatch = createEventDispatcher()

  let searchValue: string = ''
  userSearch.subscribe((v) => (searchValue = v))
</script>

<div class="header ac-header__wrap-title flex-grow">
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="ac-header__wrap-title" on:click>
    {#if allowClose}
      <Button
        focusIndex={10001}
        icon={IconClose}
        iconProps={{ size: 'medium' }}
        kind={'icon'}
        on:click={() => {
          dispatch('close')
        }}
      />
      <div class="antiHSpacer x2" />
    {/if}
    {#if withFilters}
      <div class="mr-2">
        <ChannelMessagesFilter bind:selectedFilters={filters} />
      </div>
    {/if}
    <slot />
    {#if titleKind === 'breadcrumbs'}
      <Breadcrumbs
        items={[
          {
            icon,
            iconProps,
            title: label,
            label: label ? undefined : intlLabel
          }
        ]}
      />
    {:else}
      {#if icon}
        <div class="ac-header__icon">
          <Icon {icon} size={'small'} {iconProps} />
        </div>
      {/if}
      {#if label}
        <span class="title overflow-label heading-medium-16 mr-2">{label}</span>
      {:else if intlLabel}
        <div class="title overflow-label mr-2">
          <Label label={intlLabel} />
        </div>
      {/if}
    {/if}
  </div>
  {#if description}
    <div class="ac-header__description over-underline" style="flex: 1" title={description}>{description}</div>
  {/if}
</div>
{#if canOpen && object}
  <Button
    icon={view.icon.Open}
    iconProps={{ size: 'small' }}
    kind={'icon'}
    on:click={() => {
      if (object) {
        openDoc(client.getHierarchy(), object)
      }
    }}
  />
{/if}
<SearchEdit
  value={searchValue}
  on:change={(ev) => {
    userSearch.set(ev.detail)

    if (ev.detail !== '') {
      navigateToSpecial('chunterBrowser')
    }
  }}
/>
{#if withAside}
  <Button
    icon={IconDetails}
    iconProps={{ size: 'medium', filled: isAsideShown }}
    kind={'icon'}
    selected={isAsideShown}
    on:click={() => dispatch('aside-toggled')}
  />
{/if}

<style lang="scss">
  .title {
    cursor: pointer;
    color: var(--global-secondary-TextColor);

    &:hover {
      color: var(--global-primary-LinkColor);
    }
  }
</style>
