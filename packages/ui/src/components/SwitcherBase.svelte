<script lang="ts">
  //
  // © 2023 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //

  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { AnySvelteComponent, LabelAndProps } from '../types'
  import type { ComponentType } from 'svelte'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import { tooltip as tp } from '..'

  export let id: string | number
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let color: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let title: string | undefined = undefined
  export let kind: 'nuance' | 'subtle' = 'nuance'
  export let name: string
  export let checked: boolean = false
  export let tooltip: LabelAndProps | undefined = undefined

  $: woTitle = title === undefined && label === undefined
</script>

<label use:tp={tooltip} class="switcher-element__wrapper" data-view={tooltip?.label} data-id={`tab-${id}`}>
  <input type="radio" class="switcher" {name} {checked} on:change />
  <div class="switcher-element {kind}" class:woTitle>
    {#if icon}<div class="icon"><Icon {icon} size={'small'} fill={color} /></div>{/if}
    {#if label}<span><Label {label} params={labelParams} /></span>{/if}
    {#if title}<span>{title}</span>{/if}
  </div>
</label>

<style lang="scss">
  .switcher-element,
  .switcher-element__wrapper {
    display: flex;
    min-width: var(--global-small-Size);
    min-height: var(--global-small-Size);
  }
  .switcher-element {
    justify-content: center;
    align-items: center;
    flex-wrap: nowrap;
    flex-shrink: 0;
    gap: var(--spacing-0_75);
    border-radius: var(--small-BorderRadius);

    &:not(.woTitle) {
      padding: 0 var(--spacing-1_5);
    }
    &.woTitle {
      padding: 0 var(--spacing-1);
    }
    .icon {
      width: var(--spacing-2);
      height: var(--spacing-2);
      color: var(--global-secondary-IconColor);
    }
    span {
      text-wrap: nowrap;
      color: var(--global-secondary-TextColor);
      user-select: none;
    }
  }
  .switcher {
    overflow: hidden;
    position: absolute;
    margin: -1px;
    padding: 0;
    width: 1px;
    height: 1px;
    border: 0;
    clip: rect(0 0 0 0);

    &:checked + .switcher-element.nuance {
      background-color: var(--global-accent-BackgroundColor);

      .icon {
        color: var(--global-on-nuance-TextColor);
      }
      span {
        color: var(--global-on-nuance-TextColor);
      }
    }
    &:checked + .switcher-element.subtle {
      background-color: var(--global-ui-active-BackgroundColor);

      .icon {
        color: var(--global-primary-IconColor);
      }
      span {
        color: var(--global-primary-TextColor);
      }
    }
    &:focus + .switcher-element {
      box-shadow: 0 0 0 var(--spacing-0_25) var(--global-focus-inset-BorderColor);
      outline: var(--spacing-0_25) solid var(--global-focus-BorderColor);
      outline-offset: var(--spacing-0_25);
    }
  }
  .switcher-element__wrapper:hover .switcher-element {
    background-color: var(--selector-BackgroundColor);
    cursor: pointer;

    .icon {
      color: var(--global-primary-IconColor);
    }
    span {
      color: var(--global-primary-TextColor);
    }
  }
</style>
