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
  import type { IntlString } from '@hcengineering/platform'
  import { translateCB } from '@hcengineering/platform'
  import { themeStore } from '@hcengineering/theme'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import plugin from '../plugin'
  import IconClose from './icons/Close.svelte'
  import IconSearch from './icons/Search.svelte'

  export let value: string | undefined = undefined
  export let placeholder: IntlString = plugin.string.Search
  export let placeholderParam: any | undefined = undefined
  export let collapsed: boolean = false
  export let autoFocus: boolean = false
  export let width: string | undefined = undefined
  export let delay: number = 500

  let input: HTMLInputElement
  let phTranslate: string = ''

  $: translateCB(placeholder, placeholderParam ?? {}, $themeStore.language, (res) => {
    phTranslate = res
  })

  $: _search = value
  const dispatch = createEventDispatcher()
  let timer: any

  function restartTimer (): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      value = _search
      dispatch('change', _search)
    }, delay)
  }
  onDestroy(() => {
    clearTimeout(timer)
  })
  onMount(() => {
    if (autoFocus && input) {
      autoFocus = false
      input.focus()
    }
  })
</script>

<label class="searchInput-wrapper" class:collapsed class:filled={value && value !== ''} style:width>
  <div class="searchInput-icon">
    <IconSearch size={'small'} />
  </div>
  <input
    bind:this={input}
    type="text"
    class="font-regular-14"
    bind:value={_search}
    placeholder={phTranslate}
    autocomplete="off"
    spellcheck="false"
    on:change={() => {
      restartTimer()
    }}
    on:input={() => {
      restartTimer()
    }}
    on:keydown={(evt) => {
      if (evt.key === 'Enter') {
        clearTimeout(timer)
        value = _search
        dispatch('change', _search)
      }
    }}
  />
  <button
    class="searchInput-button"
    on:click={() => {
      value = ''
      dispatch('change', '')
      input.focus()
    }}
  >
    <IconClose size={'small'} />
  </button>
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
    background-color: var(--theme-button-default); // var(--input-BackgroundColor);
    border-radius: var(--small-BorderRadius);
    box-shadow: inset 0 0 0 1px var(--theme-button-border); // var(--input-BorderColor);
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
        color: var(--theme-trans-color); // var(--input-PlaceholderColor);
      }
      &:not(:placeholder-shown) + .searchInput-button {
        visibility: visible;
      }
    }

    &:hover {
      background-color: var(--input-hover-BackgroundColor);

      input::placeholder {
        color: var(--theme-darker-color); // var(--input-hover-PlaceholderColor);
      }
    }
    &:active,
    &:focus-within {
      padding: 0 var(--spacing-0_5) 0 0;
      // max-width: 15rem;
      background-color: var(--input-BackgroundColor);
      outline: 2px solid var(--global-focus-BorderColor);
      outline-offset: 2px;

      input::placeholder {
        color: var(--theme-darker-color); // var(--input-focus-PlaceholderColor);
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
