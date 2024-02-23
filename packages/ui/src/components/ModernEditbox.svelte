<script lang="ts">
  //
  // © 2023 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //

  import { createEventDispatcher, onMount } from 'svelte'
  import { IntlString, translate } from '@hcengineering/platform'
  import { registerFocus } from '../focus'
  import Label from './Label.svelte'
  import { themeStore } from '..'

  export let label: IntlString
  export let value: string | undefined = undefined
  export let kind: 'default' | 'ghost' = 'default'
  export let size: 'small' | 'medium' | 'large' = 'small'
  export let disabled: boolean = false
  export let error: boolean = false
  export let password: boolean = false
  export let limit: number = 0
  export let element: HTMLInputElement | undefined = undefined
  export let autoFocus: boolean = false
  export let autoAction: boolean = true
  export let width: string = ''

  const dispatch = createEventDispatcher()

  $: maxlength = limit === 0 ? null : limit

  let placeholderStr: string = ''
  $: ph = translate(label, {}, $themeStore.language).then((r) => {
    placeholderStr = r
  })
  $: labeled = kind === 'default' && size === 'large'
  $: placeholder = labeled ? ' ' : placeholderStr

  onMount(() => {
    if (autoFocus && element) {
      autoFocus = false
      element.focus()
    }
  })

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      element?.focus()
      return element != null
    },
    isFocus: () => document.activeElement === element
  })
  const updateFocus = () => {
    focusManager?.setFocus(idx)
  }
  $: if (element) {
    element.addEventListener('focus', updateFocus)
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<svelte:element
  this={autoAction ? 'label' : 'div'}
  class="editbox-wrapper {kind} {size}"
  class:error
  class:disabled
  style:width
  on:click={() => {
    if (!autoAction) element?.focus()
  }}
>
  {#if size !== 'large' && $$slots.default}
    <slot />
  {/if}
  {#if password}
    <input
      bind:this={element}
      type="password"
      class="font-regular-14"
      class:labeled
      style:width
      bind:value
      autocomplete="off"
      {placeholder}
      spellcheck="false"
      {disabled}
      {maxlength}
      on:change
      on:keyup
      on:keydown
      on:input
      on:blur={() => {
        dispatch('blur', value)
      }}
    />
  {:else}
    <input
      bind:this={element}
      type="text"
      class="font-regular-14"
      class:labeled
      style:width
      bind:value
      autocomplete="off"
      {placeholder}
      spellcheck="false"
      {disabled}
      {maxlength}
      on:change
      on:keyup
      on:keydown
      on:input
      on:blur={() => {
        dispatch('blur', value)
      }}
    />
  {/if}
  {#if labeled}<div class="font-regular-14 label"><Label {label} /></div>{/if}
</svelte:element>

<style lang="scss">
  .editbox-wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-0_75);
    min-width: 0;
    border-radius: var(--medium-BorderRadius);

    &.default {
      background-color: var(--input-BackgroundColor);
      box-shadow: inset 0 0 0 1px var(--input-BorderColor);

      &.small {
        padding: var(--spacing-1) var(--spacing-1_5);
        height: var(--global-small-Size);
      }
      &.medium {
        padding: var(--spacing-1_5) var(--spacing-2);
        height: var(--global-medium-Size);
      }
      &.large {
        position: relative;
        padding: 0 var(--spacing-2);
        height: var(--global-extra-large-Size);
      }
    }
    &.ghost {
      &.small,
      &.medium {
        // medium/ghost - not designed
        padding: var(--spacing-1_5) var(--spacing-2);
        height: var(--spacing-5);
      }
      &.large {
        padding: var(--spacing-1) var(--spacing-2);
        height: var(--spacing-6);

        input {
          font-weight: 500;
          font-size: 1.5rem;
        }
      }
    }

    &.error {
      box-shadow: inset 0 0 0 1px var(--input-error-BorderColor);
    }
    &:not(.disabled) {
      cursor: text;

      &.default {
        input::placeholder {
          color: var(--input-PlaceholderColor);
        }
        &:active,
        &:focus-within {
          background-color: var(--input-BackgroundColor);
          outline: 2px solid var(--global-focus-BorderColor);
          outline-offset: 2px;
        }
        &:hover {
          background-color: var(--input-hover-BackgroundColor);
        }
      }
      &.ghost input::placeholder {
        color: var(--input-PlaceholderColor);
      }
      &:hover input:not(:focus)::placeholder {
        color: var(--input-hover-PlaceholderColor);
      }
      &.default:active input::placeholder,
      input:focus::placeholder {
        color: var(--input-focus-PlaceholderColor);
      }
    }
    &.disabled {
      &,
      input {
        cursor: not-allowed;
      }
      input::placeholder {
        color: var(--input-PlaceholderColor);
      }
      &.default {
        background-color: transparent;
      }
      &.ghost {
        box-shadow: inset 0 0 0 1px var(--input-BorderColor);
      }
    }

    input {
      margin: 0;
      padding: 0;
      width: 100%;
      color: var(--input-TextColor);
      caret-color: var(--global-focus-BorderColor);
      background-color: transparent;
      border: none;
      outline: none;
      appearance: none;

      &.labeled {
        height: 100%;
        padding-top: var(--spacing-3_5);
        padding-bottom: var(--spacing-1_5);
      }
    }

    .label {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      padding: var(--spacing-2_5) var(--spacing-2);
      font-size: 0.875rem;
      color: var(--input-LabelColor);
      transition:
        padding-top 0.2s,
        font-size 0.2s;
      pointer-events: none;
      user-select: none;
    }
    input:focus + .label,
    input:not(:placeholder-shown) + .label {
      padding-top: var(--spacing-1_5);
      font-size: 0.75rem;
      color: var(--input-filled-LabelColor);
    }
  }
</style>
