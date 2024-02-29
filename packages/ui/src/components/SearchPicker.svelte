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
  import { createEventDispatcher } from 'svelte'
  import Chip from './Chip.svelte'

  interface Item {
    id: string
    label: string
  }

  export let autoFocus: boolean = false
  export let placeholder = ''
  export let value = ''
  export let items: Item[] = []

  const dispatch = createEventDispatcher()

  let inputRef: HTMLInputElement | undefined
  const itemsRef: Chip[] = []

  function handleBackspace (event: KeyboardEvent) {
    if (event.key === 'Backspace' && value === '' && items.length > 0) {
      itemsRef[items.length - 1].focus()
    }
    dispatch('keydown', event)
  }

  function handleItemRemove (id: string) {
    dispatch('item-remove', id)
    inputRef?.focus()
  }

  export function focus () {
    inputRef?.focus()
    autoFocus = false
  }

  $: if (inputRef !== undefined && autoFocus) {
    focus()
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="flex flex-gap-1 flex-wrap search-picker" on:click={() => inputRef?.focus()}>
  {#each items as item, i}
    <Chip
      bind:this={itemsRef[i]}
      label={item.label}
      on:remove={() => {
        handleItemRemove(item.id)
      }}
    />
  {/each}
  <input
    bind:this={inputRef}
    class="flex-grow font-regular-14"
    type="text"
    autocomplete="off"
    spellcheck="false"
    {placeholder}
    bind:value
    on:change
    on:input
    on:keydown={handleBackspace}
  />
</div>

<style lang="scss">
  .search-picker {
    position: relative;
    width: 100%;
    padding: var(--spacing-0_5);
    border-radius: var(--small-focus-BorderRadius);
    box-shadow: inset 0 0 0 0.0625rem var(--input-BorderColor);
    cursor: text;

    &:focus-within {
      box-shadow:
        inset 0 0 0 0.0625rem var(--input-BorderColor),
        0 0 0 0.125rem var(--global-focus-inset-BorderColor);
      outline: 0.125rem solid var(--global-focus-BorderColor);
      outline-offset: 0.125rem;
    }

    input {
      height: var(--global-small-Size);
      padding: 0;
      border: none;
      caret-color: var(--input-search-IconColor);

      &::placeholder {
        color: var(--global-disabled-TextColor);
      }

      &:only-child {
        padding: var(--spacing-0_5) var(--spacing-1_25);
      }
    }
  }
</style>
