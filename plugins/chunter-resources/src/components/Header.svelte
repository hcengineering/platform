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
    IconDetails,
    Label,
    SearchInput,
    Header,
    HeaderAdaptive
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
  export let allowClose: boolean = false
  export let allowFullsize: boolean = false
  export let canOpen: boolean = false
  export let withAside: boolean = false
  export let isAsideShown: boolean = false
  export let titleKind: 'default' | 'breadcrumbs' = 'default'
  export let withFilters: boolean = false
  export let withSearch: boolean = true
  export let filters: Ref<ActivityMessagesFilter>[] = []
  export let adaptive: HeaderAdaptive = 'default'
  export let hideActions: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  export let searchValue: string = ''
  userSearch.subscribe((v) => (searchValue = v))
</script>

<Header
  {allowFullsize}
  type={allowClose ? 'type-aside' : 'type-component'}
  hideBefore={false}
  hideActions={!((canOpen && object) || withAside || $$slots.actions) || hideActions}
  hideDescription={!description}
  adaptive={adaptive !== 'default' ? adaptive : withFilters ? 'freezeActions' : 'disabled'}
  on:click
  on:close
>
  <svelte:fragment slot="beforeTitle">
    <slot />
  </svelte:fragment>

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
      currentOnly
    />
  {:else}
    <div class="hulyHeader-titleGroup">
      {#if icon}
        <div class="content-color mr-2 pl-2">
          <Icon {icon} size={'small'} {iconProps} />
        </div>
      {/if}
      {#if label}
        <span class="secondary-textColor overflow-label heading-medium-16 mr-2">{label}</span>
      {:else if intlLabel}
        <div class="secondary-textColor overflow-label mr-2">
          <Label label={intlLabel} />
        </div>
      {/if}
    </div>
  {/if}

  <svelte:fragment slot="description">
    {#if description}
      <div class="overflow-label content-dark-color text-sm pl-2 mt--1" title={description}>{description}</div>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="search" let:doubleRow>
    {#if withSearch}
      <SearchInput
        collapsed
        bind:value={searchValue}
        on:change={(ev) => {
          userSearch.set(ev.detail)

          if (ev.detail !== '') {
            navigateToSpecial('chunterBrowser')
          }
        }}
      />
      {#if withFilters}
        <ChannelMessagesFilter bind:selectedFilters={filters} />
      {/if}
      <slot name="search" {doubleRow} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="actions" let:doubleRow>
    <slot name="actions" {doubleRow} />
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
    {#if withAside}
      <Button
        icon={IconDetails}
        iconProps={{ size: 'medium', filled: isAsideShown }}
        kind={'icon'}
        selected={isAsideShown}
        on:click={() => dispatch('aside-toggled')}
      />
    {/if}
  </svelte:fragment>
</Header>

<style lang="scss">
  .title {
    cursor: pointer;
    color: var(--global-secondary-TextColor);

    &:hover {
      color: var(--global-primary-LinkColor);
    }
  }
</style>
