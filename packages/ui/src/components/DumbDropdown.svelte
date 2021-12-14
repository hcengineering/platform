<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { IntlString } from '@anticrm/platform'

  import Label from './Label.svelte'
  import IconUp from './icons/Up.svelte'
  import IconDown from './icons/Down.svelte'

  import { DumbDropdownItem } from '../types';

  export let items: DumbDropdownItem[]
  export let selected: DumbDropdownItem['id'] | undefined
  export let title: IntlString | undefined

  let isDisabled = false
  $: isDisabled = items.length === 0

  let isOpened = false
  let selectedItem = items.find((x) => x.id === selected)
  $: selectedItem = items.find((x) => x.id === selected)
  $: if (selected === undefined && items[0] !== undefined) {
    selected = items[0].id
  }

  function onItemClick (id: DumbDropdownItem['id']) {
    selected = id
  }

  function onClick () {
    isOpened = !isOpened
  }

  function onClickOutside () {
    isOpened = false
  }

  function clickOutside (node: any, onEventFunction: any) {
    const handleClick = (event: any) => {
      const path = event.composedPath()

      if (!path.includes(node)) {
        onEventFunction()
      }
    }

    document.addEventListener('click', handleClick)

    return {
      destroy () {
        document.removeEventListener('click', handleClick)
      }
    }
  }
  
  const none = 'None' as IntlString
</script>

<div class="root" class:disabled={isDisabled} on:click={onClick} use:clickOutside={onClickOutside}>
  <div class="selected">
    <div class="content">
      {#if title !== undefined}
        <div class="title">
          <Label label={title} />
        </div>
      {/if}
      <div class="label">
        {#if selectedItem?.label !== undefined}
          {selectedItem.label}
        {:else}
          <Label label={none} />
        {/if}
      </div>
    </div>
    <div class="icon">
      {#if isOpened}
        <IconUp size="small" />
      {:else}
        <IconDown size="small" />
      {/if}
    </div>
  </div>
  {#if isOpened}
    <div class="items-container">
      <div class="items">
        {#each items as item (item.id)}
          <div class="item" on:click={() => onItemClick(item.id)}>
            {item.label}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    font-family: inherit;
    font-size: 14px;
    border: 2px solid transparent;
    border-radius: 2px;
    cursor: pointer;

    &.disabled {
      cursor: unset;
    }
  }

  .selected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
  }

  .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .title {
    font-size: 12px;
    font-weight: 500;
    color: var(--theme-content-accent-color);
    opacity: 0.8;
    user-select: none;
  }

  .label {
    flex-grow: 1;
    min-width: 0;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-right: 15px;

    color: var(--theme-caption-color);
  }

  .items-container {
    position: relative;
  }

  .items {
    position: absolute;
    width: 100%;

    top: 18px;

    display: flex;
    flex-direction: column;

    max-height: 300px;
    overflow-y: auto;

    background-color: var(--theme-button-bg-hovered);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 12px;

    z-index: 1000;
  }

  .item {
    flex-shrink: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-right: 15px;

    padding: 10px 20px;

    &:first-child {
      padding-top: 20px;
      padding-bottom: 10px;
    }

    &:last-child {
      padding-bottom: 20px;
    }

    &:hover {
      background-color: var(--theme-bg-accent-color);
    }
  }
</style>
