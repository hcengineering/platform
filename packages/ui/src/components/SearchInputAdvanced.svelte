<!--
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
-->
<!--
  SearchInput with prefix-operator + scope-wrapping support.
  Wraps the existing SearchInput visual style — copies its scoped
  style block verbatim, since Svelte does not allow cross-component
  @import of scoped styles, so the duplication is intentional.

  Emits a `change` event with BOTH detail.raw (what the user typed) and
  detail.encoded (the ES query_string form). IssuesView binds the input
  to `raw` (so the input field never shows the encoded form) and pipes
  `encoded` into the find-query.
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import type { IntlString } from '@hcengineering/platform'
  import { translateCB } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/theme'
  import IconSearch from './icons/Search.svelte'
  import plugin from '../plugin'
  import { encodeSearch, type SearchScope } from './SearchInputAdvanced.encoder'

  /**
   * `value` is the RAW user input. NEVER write the encoded wire-string
   * back into it — otherwise on the next debounce the user sees
   * `searchTitle:(loader)` in their own input field, which is broken UX.
   *
   * The component dispatches a `change` event with BOTH:
   *   detail.raw     — exactly what the user typed (after trim)
   *   detail.encoded — encodeSearch(raw, scope), the wire-form for $search
   */
  export let value: string | undefined = undefined
  export let placeholder: IntlString = plugin.string.Search
  export let placeholderParam: any | undefined = undefined
  export let collapsed: boolean = false
  export let autoFocus: boolean = false
  export let width: string | undefined = undefined
  export let delay: number = 500
  export let scope: SearchScope = 'all'

  let input: HTMLInputElement
  let phTranslate: string = ''
  let _search = value ?? ''
  const dispatch = createEventDispatcher<{ change: { raw: string, encoded: string } }>()
  let timer: any

  $: translateCB(placeholder, placeholderParam ?? {}, $themeStore.language, (res) => {
    phTranslate = res
  })
  // Only re-sync from the parent prop when it actually changes — never
  // overwrite `_search` mid-typing (would clobber the cursor + value).
  $: if (value !== _search && value !== undefined) _search = value

  function emit (): void {
    const raw = _search.trim()
    const encoded = encodeSearch(raw, scope)
    value = _search // parent-owned value mirrors raw, never encoded
    dispatch('change', { raw, encoded })
  }

  function restart (): void {
    clearTimeout(timer)
    timer = setTimeout(emit, delay)
  }

  onDestroy(() => clearTimeout(timer))
  onMount(() => {
    if (autoFocus && input != null) input.focus()
  })
</script>

<label
  class="searchInput-wrapper"
  class:collapsed
  class:filled={value !== undefined && value !== ''}
  style:width
>
  <div class="searchInput-icon"><IconSearch size={'small'} /></div>
  <input
    bind:this={input}
    type="text"
    class="font-regular-14"
    bind:value={_search}
    placeholder={phTranslate}
    autocomplete="off"
    spellcheck="false"
    on:input={restart}
    on:keydown={(evt) => {
      if (evt.key === 'Enter') {
        clearTimeout(timer)
        emit()
      }
    }}
  />
</label>

<style lang="scss">
  .searchInput-wrapper {
    display: flex;
    justify-content: stretch;
    align-items: center;
    align-self: stretch;
    padding: 0 var(--spacing-0_5) 0 0;
    height: var(--global-small-Size);
    min-width: var(--global-small-Size);
    background-color: var(--theme-button-default);
    border-radius: var(--small-BorderRadius);
    box-shadow: inset 0 0 0 1px var(--theme-button-border);
    transition: max-width 0.2s;
    cursor: text;

    .searchInput-icon,
    .searchInput-button {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      padding: 0;
      background-color: transparent;
      border: none;

      div {
        width: var(--global-min-Size);
        height: var(--global-min-Size);
      }
    }
    .searchInput-icon {
      margin: 0 var(--spacing-0_5) 0 0;
      width: var(--global-small-Size);
      height: var(--global-small-Size);
      color: var(--input-search-IconColor);
      border-radius: var(--small-BorderRadius);
      outline: none;
      cursor: text;

      &:active,
      &:focus {
        background-color: transparent;
      }
    }
    .searchInput-button {
      visibility: hidden;
      width: var(--global-extra-small-Size);
      height: var(--global-extra-small-Size);
      color: var(--global-primary-TextColor);
      border-radius: var(--extra-small-BorderRadius);
      cursor: pointer;

      &:hover {
        background-color: var(--button-tertiary-hover-BackgroundColor);
      }
      &:active {
        background-color: var(--button-tertiary-active-BackgroundColor);
        border-color: var(--button-menu-active-BorderColor);
      }
    }

    input {
      margin: 0;
      margin-right: var(--spacing-1_5);
      padding: 0;
      width: 100%;
      height: 100%;
      color: var(--input-TextColor);
      caret-color: var(--global-focus-BorderColor);
      background-color: transparent;
      border: none;
      outline: none;
      appearance: none;

      &::placeholder {
        color: var(--theme-trans-color);
      }
      &:not(:placeholder-shown) + .searchInput-button {
        visibility: visible;
      }
    }

    &:hover {
      background-color: var(--input-hover-BackgroundColor);

      input::placeholder {
        color: var(--theme-darker-color);
      }
    }
    &:active,
    &:focus-within {
      padding: 0 var(--spacing-0_5) 0 0;
      background-color: var(--input-BackgroundColor);
      outline: 2px solid var(--global-focus-BorderColor);
      outline-offset: 2px;

      input::placeholder {
        color: var(--theme-darker-color);
      }
    }

    &.collapsed:not(:focus-within, :active, .filled) {
      padding: 0;
      max-width: var(--global-small-Size);

      .searchInput-icon {
        cursor: pointer;
      }
      input:not(:placeholder-shown) + .searchInput-button {
        visibility: hidden;
      }
    }
  }
</style>
