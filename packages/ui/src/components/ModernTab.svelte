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
  import { Asset, getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  import { AnySvelteComponent, ButtonIcon, Icon, IconClose, Label, tooltip } from '../index'

  export let label: string | undefined = undefined
  export let labelIntl: IntlString | undefined = undefined
  export let boldLabel: string | undefined = undefined
  export let boldLabelIntl: IntlString | undefined = undefined
  export let highlighted: boolean = false
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let maxSize: string | undefined = undefined
  export let orientation: 'horizontal' | 'vertical' = 'horizontal'
  export let kind: 'primary' | 'secondary' = 'primary'
  export let canClose = true

  const dispatch = createEventDispatcher()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="container main flex-row-center flex-gap-2 {orientation} {kind}"
  style:max-width={orientation === 'horizontal' ? maxSize : 'auto'}
  style:max-height={orientation === 'vertical' ? maxSize : 'auto'}
  class:active={highlighted}
  use:tooltip={{ label: label ? getEmbeddedLabel(label) : labelIntl }}
  on:click
  on:contextmenu
>
  <slot name="prefix" />

  {#if icon}
    <div class="icon {orientation}">
      <Icon {icon} size={'x-small'} {iconProps} />
    </div>
  {/if}

  <span class="overflow-label">
    {#if label}
      {label}
    {:else if labelIntl}
      <Label label={labelIntl} />
    {/if}
    {#if boldLabel}
      <span class="label">
        {boldLabel}
      </span>
    {:else if boldLabelIntl}
      <span class="label">
        <Label label={boldLabelIntl} />
      </span>
    {/if}
  </span>

  {#if canClose}
    <div class="close-button {orientation}">
      <ButtonIcon icon={IconClose} size="min" on:click={() => dispatch('close')} />
    </div>
  {:else}
    <div />
  {/if}
</div>

<style lang="scss">
  .container {
    font-weight: 500;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    cursor: pointer;
    overflow: hidden;
    color: var(--theme-content-color);

    &.primary {
      background-color: var(--theme-button-pressed);
    }

    &.secondary {
      border-color: var(--highlight-select-border);
    }

    &.horizontal {
      padding: 0.125rem 0.125rem 0.125rem 0.5rem;
      height: 1.625rem;
    }

    &.vertical {
      padding: 0.5rem 0.125rem 0.125rem 0.125rem;
      width: 1.625rem;
      writing-mode: vertical-rl;
      text-orientation: sideways;
    }

    .label {
      font-weight: 700;
      color: var(--theme-caption-color);
    }

    &.main {
      &.horizontal {
        padding-right: 0.25rem;
      }

      &.vertical {
        padding-bottom: 0.25rem;
      }
    }

    &:hover {
      &.primary {
        background-color: var(--theme-button-hovered);
        border-color: var(--theme-navpanel-divider);
      }

      &.secondary {
        border-color: var(--highlight-select-border);
      }
    }

    &.active {
      position: relative;
      display: flex;
      align-items: center;
      cursor: default;
      background-color: var(--highlight-select);
      border-color: var(--highlight-select-border);

      &:hover {
        background-color: var(--highlight-select);
        border-color: var(--highlight-select-border);
      }
    }

    .icon {
      writing-mode: initial;
      text-orientation: initial;
      &.vertical {
        transform: rotate(90deg);
        text-orientation: upright;
      }
    }

    .close-button {
      display: flex;
      &.vertical {
        transform: rotate(90deg);
      }
    }
  }
</style>
