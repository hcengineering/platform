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
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { Label, Scroller, Submenu } from '..'
  import { resizeObserver } from '../resize'
  import { DropdownIntlItem } from '../types'
  import { LocalizedSearch } from '../search'
  import NestedMenu from './NestedMenu.svelte'
  import SearchEdit from './SearchEdit.svelte'
  import Icon from './Icon.svelte'
  import plugin from '../plugin'

  export let items: [DropdownIntlItem, DropdownIntlItem[]][]
  export let nestedFrom: DropdownIntlItem | undefined = undefined
  export let onSelect: ((val: DropdownIntlItem) => void) | undefined = undefined
  export let withIcon: boolean = false
  export let disableFocusOnMouseover: boolean = false
  export let withSearch: boolean = false

  const elements: HTMLElement[] = []
  let searchText = ''
  let filteredItems: [DropdownIntlItem, DropdownIntlItem[]][] = []
  const localizedSearch = new LocalizedSearch()
  let isInitialRender = true
  let resizeTimeout: ReturnType<typeof setTimeout>

  const dispatch = createEventDispatcher()

  const actionElements: HTMLButtonElement[] = []

  // Update filtered items when search text or items change
  $: if (withSearch) {
    void localizedSearch.filter(items, searchText).then((result) => {
      filteredItems = result
    })
  } else {
    filteredItems = items
  }

  $: displayItems = withSearch ? filteredItems : items

  // Prevent resize observer from triggering on initial render and debounce rapid changes
  function handleResize (): void {
    if (isInitialRender && withSearch) {
      isInitialRender = false
      return
    }

    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      dispatch('changeContent')
    }, 50)
  }

  const keyDown = (event: KeyboardEvent, index: number): void => {
    if (event.key === 'ArrowDown') {
      actionElements[(index + 1) % actionElements.length]?.focus()
    }

    if (event.key === 'ArrowUp') {
      actionElements[(actionElements.length + index - 1) % actionElements.length]?.focus()
    }

    if (event.key === 'ArrowLeft') {
      dispatch('close')
    }
  }

  function onNestedSelect (val: any): void {
    dispatch('close', val)
  }

  function click (val: DropdownIntlItem): void {
    onSelect?.(val)
    dispatch('close', val)
  }

  onDestroy(() => {
    clearTimeout(resizeTimeout)
  })
</script>

<div class="selectPopup" use:resizeObserver={handleResize}>
  <div class="menu-space" />
  {#if withSearch}
    <div class="search-header">
      <SearchEdit bind:value={searchText} kind="ghost" />
    </div>
  {/if}
  <Scroller noFade={false} showOverflowArrows>
    {#if nestedFrom}
      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
      <button
        class="menu-item"
        on:keydown={(event) => {
          keyDown(event, -1)
        }}
        on:mouseover={(event) => {
          if (!disableFocusOnMouseover) {
            event.currentTarget.focus()
          }
        }}
        on:click={() => {
          if (nestedFrom !== undefined) {
            click(nestedFrom)
          }
        }}
      >
        {#if withIcon && nestedFrom.icon}
          <div class="icon">
            <Icon icon={nestedFrom.icon} iconProps={nestedFrom.iconProps} size={'small'} />
          </div>
        {/if}
        <div class="overflow-label pr-1"><Label label={nestedFrom.label} /></div>
      </button>
      <div class="divider" />
    {/if}
    {#each displayItems as item, i}
      {#if item[1].length > 0 && nestedFrom === undefined}
        <Submenu
          bind:element={elements[i]}
          on:keydown={(event) => {
            keyDown(event, i)
          }}
          on:mouseover={() => {
            if (!disableFocusOnMouseover) {
              elements[i]?.focus()
            }
          }}
          label={item[0].label}
          icon={withIcon ? item[0].icon : undefined}
          iconProps={item[0].iconProps}
          props={{
            items: item[1].map((p) => {
              return [p, []]
            }),
            nestedFrom: item[0],
            onSelect: onNestedSelect,
            withIcon,
            disableFocusOnMouseover
          }}
          options={{ component: NestedMenu }}
        />
      {:else}
        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
        <button
          class="menu-item"
          on:keydown={(event) => {
            keyDown(event, i)
          }}
          on:mouseover={(event) => {
            if (!disableFocusOnMouseover) {
              event.currentTarget.focus()
            }
          }}
          on:click={() => {
            click(item[0])
          }}
        >
          {#if withIcon && item[0].icon}
            <div class="icon">
              <Icon icon={item[0].icon} iconProps={item[0].iconProps} size={'small'} />
            </div>
          {/if}
          <div class="overflow-label pr-1"><Label label={item[0].label} /></div>
        </button>
      {/if}
    {:else}
      {#if withSearch && searchText.trim() !== ''}
        <div class="empty-placeholder content-trans-color">
          <Label label={plugin.string.NoResults} />
        </div>
      {/if}
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>

<style lang="scss">
  .search-header {
    padding: 0.5rem;
    border-bottom: 1px solid var(--theme-divider-color);
    margin-bottom: 0.25rem;
  }

  .empty-placeholder {
    padding: 0.5rem;
    text-align: center;
  }
</style>
