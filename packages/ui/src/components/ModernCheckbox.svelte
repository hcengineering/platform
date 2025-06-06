<script lang="ts">
  //
  // © 2023 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //
  import type { IntlString } from '@hcengineering/platform'
  import { generateId } from '@hcengineering/core'
  import { Label } from '../..'

  export let id: string = generateId()
  export let label: string | undefined = undefined
  export let labelIntl: IntlString | undefined = undefined
  export let labelParams: Record<string, any> | undefined = undefined
  export let checked: boolean = false
  export let indeterminate: boolean = false
  export let disabled: boolean = false
  export let error: boolean = false
  export let required: boolean = false
</script>

<label class="checkbox-container" class:disabled>
  <input type="checkbox" class="checkbox" {id} bind:checked {disabled} {indeterminate} {required} on:change />
  <div class="checkbox-element" class:disabled class:error />
  {#if label !== undefined || labelIntl !== undefined || $$slots.default !== undefined}
    <div class="checkbox-label">
      {#if labelIntl}<Label label={labelIntl} params={labelParams} />{:else}{label}{/if}
      <slot />
    </div>
  {/if}
  <slot name="after" />
</label>

<style lang="scss">
  .checkbox-element {
    position: relative;
    flex-shrink: 0;
    width: var(--spacing-2);
    height: var(--spacing-2);
    background-color: var(--selector-BackgroundColor);
    border: 1px solid var(--selector-BorderColor);
    border-radius: var(--extra-small-BorderRadius);
  }
  .checkbox-label {
    color: var(--global-primary-TextColor);
    user-select: none;
  }
  .checkbox {
    overflow: hidden;
    position: absolute;
    margin: -1px;
    padding: 0;
    width: 1px;
    height: 1px;
    border: 0;
    clip: rect(0 0 0 0);

    &:checked + .checkbox-element,
    &:indeterminate + .checkbox-element {
      background-color: var(--selector-active-BackgroundColor);
      border-color: var(--selector-active-BackgroundColor);

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0.625rem;
        height: 0.5rem;
        background-color: var(--selector-IconColor);
        transform: translate(-50%, -50%);
      }
    }
    &:checked + .checkbox-element::after {
      clip-path: path(
        'M9.7,0.5c0.4,0.4,0.4,1,0,1.4L4.1,7.8L0.3,4.2c-0.4-0.4-0.4-1,0-1.4c0.4-0.4,1-0.4,1.4,0L4,5l4.3-4.5C8.6,0.1,9.3,0.1,9.7,0.5z'
      );
    }
    &:indeterminate + .checkbox-element::after {
      clip-path: path('M0,4c0-0.6,0.4-1,1-1h8c0.6,0,1,0.4,1,1c0,0.6-0.4,1-1,1H1C0.4,5,0,4.6,0,4z');
    }
    &:disabled + .checkbox-element {
      box-shadow: none;
      background-color: var(--selector-disabled-BackgroundColor);
      border-color: var(--selector-disabled-BorderColor);

      & + .checkbox-label {
        color: var(--global-disabled-TextColor);
      }
    }
    & + .checkbox-element.error {
      border-color: var(--border-color-global-error-border-color);
    }
    &:focus + .checkbox-element {
      outline: 2px solid var(--global-focus-BorderColor);
      outline-offset: 2px;
    }
    &:required + .checkbox-element + .checkbox-label::after {
      content: '*';
      position: relative;
      top: -0.125rem;
      left: 0.125rem;
      color: var(--global-error-TextColor);
    }
  }
  .checkbox-container {
    display: inline-flex;
    gap: var(--spacing-1_5);
    min-width: var(--spacing-2);
    min-height: var(--spacing-2);

    &:not(.disabled) {
      cursor: pointer;

      &:active .checkbox-element {
        outline: 2px solid var(--global-focus-BorderColor);
        outline-offset: 2px;
      }
      &:hover .checkbox-element {
        box-shadow: 0 0 0 4px var(--selector-hover-overlay-BackgroundColor);
      }
    }
  }
</style>
