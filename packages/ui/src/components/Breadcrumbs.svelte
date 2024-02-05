<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher, ComponentType } from 'svelte'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent } from '../types'
  import ChevronRight from './icons/ChevronRight.svelte'
  import Label from './Label.svelte'
  import Breadcrumb from './Breadcrumb.svelte'

  interface BreadcrumbItem {
    icon?: Asset | AnySvelteComponent | ComponentType
    iconProps?: any
    iconWidth?: string
    withoutIconBackground?: boolean
    label?: IntlString
    title?: string
  }

  export let items: BreadcrumbItem[]
  export let afterLabel: IntlString | undefined = undefined
  export let size: 'large' | 'small' = 'large'
  export let selected: number | null = null

  const dispatch = createEventDispatcher()
</script>

<div class="hulyBreadcrumbs-container {size}">
  {#each items as item, i}
    {#if i !== 0}<ChevronRight size={'small'} />{/if}
    <Breadcrumb
      {...item}
      {size}
      isCurrent={selected === i}
      on:click={() => {
        if (selected !== i) dispatch('select', i)
      }}
    />
  {/each}
  {#if afterLabel || $$slots.afterLabel}
    <span class="hulyBreadcrumbs-afterLabel font-medium-12">
      {#if afterLabel}<Label label={afterLabel} />{/if}
      <slot name="afterLabel" />
    </span>
  {/if}
</div>

<style lang="scss">
  .hulyBreadcrumbs-container {
    display: flex;
    align-items: center;
    height: var(--global-small-Size);
    min-width: 0;

    .hulyBreadcrumbs-afterLabel {
      white-space: nowrap;
      word-break: break-all;
      text-overflow: ellipsis;
      overflow: hidden;
      padding: var(--spacing-0_25) var(--spacing-0_5);
      text-transform: uppercase;
      background-color: var(--global-ui-hover-BackgroundColor);
      color: var(--global-secondary-TextColor);
      border-radius: 0.25rem;
    }
  }
</style>
