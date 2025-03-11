<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { IntlString } from '@hcengineering/platform'

  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import { type IconComponent } from '../types'

  export let label: string | undefined = undefined
  export let labelIntl: IntlString | undefined = undefined
  export let icon: IconComponent
  export let selected: boolean = false
</script>

<button class="nav-item" class:selected on:click>
  <span class="nav-item__icon">
    <Icon {icon} size="medium" />
  </span>
  <span class="nav-item__label next-label-overflow">
    {#if label}
      {label}
    {:else if labelIntl}
      <Label label={labelIntl} />
    {/if}
  </span>
</button>

<style lang="scss">
  .nav-item {
    border: 0;
    outline: 0;
    cursor: pointer;

    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 2.25rem;
    width: inherit;
    min-width: 0;
    overflow: hidden;

    padding: 0.375rem;
    gap: 0.5rem;
    border-radius: 0.5rem;

    &:hover {
      background: var(--next-button-menu-ghost-background-color-hover);
    }

    &.selected {
      background: var(--next-button-menu-ghost-background-color-active);
    }
  }

  .nav-item__icon {
    display: flex;
    width: 1.5rem;
    height: 1.5rem;
    min-width: 1.5rem;
    min-height: 1.5rem;
    justify-content: center;
    align-items: center;
    color: var(--next-label-color-secondary);
  }

  .nav-item__label {
    color: var(--next-text-color-secondary);
    font-size: 0.875rem;
    font-weight: 400;
  }
</style>
