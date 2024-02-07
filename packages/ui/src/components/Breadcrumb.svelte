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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent } from '../types'
  import { ComponentType } from 'svelte'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let iconWidth: string | undefined = undefined
  export let withoutIconBackground = false
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let size: 'large' | 'small'
  export let isCurrent: boolean = false
</script>

<button class="hulyBreadcrumb-container {size}" class:current={isCurrent} on:click>
  {#if size === 'large' && icon}
    <div class="hulyBreadcrumb-avatar" style:width={iconWidth ?? null} class:withoutIconBackground>
      <Icon {icon} size={'small'} {iconProps} />
    </div>
  {/if}
  <span class="{size === 'large' ? 'heading-medium-16' : 'font-regular-14'} hulyBreadcrumb-label overflow-label">
    {#if label}<Label {label} />{/if}
    {#if title}{title}{/if}
  </span>
</button>

<style lang="scss">
  .hulyBreadcrumb-container {
    display: flex;
    align-items: center;
    gap: var(--spacing-0_75);
    margin: 0;
    padding: 0 var(--spacing-1);
    min-width: 0;
    border: none;
    outline: none;
    cursor: default;

    .hulyBreadcrumb-avatar {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      padding: var(--spacing-0_5);
      width: var(--global-extra-small-Size);
      height: var(--global-extra-small-Size);
      color: var(--global-secondary-TextColor);
      background-color: var(--global-ui-BackgroundColor);
      border-radius: var(--extra-small-BorderRadius);

      &.withoutIconBackground {
        background-color: transparent;
      }
    }
    .hulyBreadcrumb-label {
      color: var(--global-secondary-TextColor);
    }
    &.current .hulyBreadcrumb-label {
      font-weight: 700;
    }
    &:not(.current) {
      cursor: pointer;

      &:hover {
        .hulyBreadcrumb-avatar {
          background-color: var(--global-ui-hover-BackgroundColor);
        }
        .hulyBreadcrumb-label {
          color: var(--global-primary-LinkColor);
        }
      }
    }
  }
</style>
