<script lang="ts">
  //
  // © 2023 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import type { IntlString } from '@hcengineering/platform'
  import Label from './Label.svelte'

  export let title: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let size: 'small' | 'large' = 'large'
  export let checked: boolean = false
  export let disabled: boolean = false
  export let background: boolean = false
</script>

<label
  class="toggle-container {size}"
  class:background
  class:disabled
  class:woLabel={label === undefined && title === undefined}
>
  <input type="checkbox" class="toggle" bind:checked {disabled} on:change />
  <div class="toggle-element {size}" class:disabled />
  {#if label || title}
    <div class="toggle-label">
      {#if label}<Label {label} params={labelParams} />{/if}
      {#if title}{title}{/if}
    </div>
  {/if}
</label>

<style lang="scss">
  .toggle-element {
    position: relative;
    flex-shrink: 0;
    background-color: var(--selector-off-BackgroundColor);

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: var(--spacing-1);
      height: var(--spacing-1);
      background-color: var(--selector-IconColor);
      border-radius: 50%;
      transform: translateY(-50%);
      transition: left 0.2s;
    }
    &.small {
      width: var(--spacing-4);
      height: var(--spacing-2);
      border-radius: var(--medium-BorderRadius);

      &::after {
        left: var(--spacing-0_5);
        width: var(--spacing-1);
        height: var(--spacing-1);
      }
    }
    &.large {
      width: var(--spacing-6);
      height: var(--spacing-3);
      border-radius: var(--large-BorderRadius);

      &::after {
        left: var(--spacing-0_75);
        width: var(--spacing-1_75);
        height: var(--spacing-1_75);
      }
    }
  }
  .toggle-label {
    color: var(--global-primary-TextColor);
    user-select: none;
  }
  .toggle {
    overflow: hidden;
    position: absolute;
    margin: -1px;
    padding: 0;
    width: 1px;
    height: 1px;
    border: 0;
    clip: rect(0 0 0 0);

    &:checked + .toggle-element {
      background-color: var(--selector-active-BackgroundColor);

      &.small::after {
        left: var(--spacing-2_5);
      }
      &.large::after {
        left: var(--spacing-3_5);
      }
    }
    &:disabled + .toggle-element {
      box-shadow: none;
      background-color: var(--selector-disabled-BackgroundColor);

      &::after {
        background-color: var(--selector-disabled-IconColor);
      }
      & + .toggle-label {
        color: var(--global-disabled-TextColor);
      }
    }
    &:focus + .toggle-element {
      outline: 2px solid var(--global-focus-BorderColor);
      outline-offset: 2px;
    }
  }
  .toggle-container {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: var(--spacing-2);
    min-height: var(--spacing-2);

    &.background {
      border-radius: 3rem;

      &.woLabel {
        padding: var(--spacing-1);
      }
      &.small:not(.woLabel) {
        padding: var(--spacing-1) var(--spacing-2) var(--spacing-1) var(--spacing-1);
      }
      &.large:not(.woLabel) {
        padding: var(--spacing-1) var(--spacing-3) var(--spacing-1) var(--spacing-1);
      }
    }
    &.disabled.background {
      box-shadow: 0 0 0 1px var(--selector-disabled-BorderColor);
    }
    &:not(.disabled) {
      cursor: pointer;

      &.background {
        background-color: var(--selector-BackgroundColor);
      }
      &:active .toggle-element {
        outline: 2px solid var(--global-focus-BorderColor);
        outline-offset: 2px;
      }
      &:hover .toggle-element {
        box-shadow: 0 0 0 4px var(--selector-hover-overlay-BackgroundColor);
      }
    }
  }
</style>
