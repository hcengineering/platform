<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023, 2024 Hardcore Engineering Inc.
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
  import presentation, { reduceCalls } from '@hcengineering/presentation'
  import { Label, ListView, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import emojiReplaceDict from './extension/emojiIdMap.json'

  export let query = ''

  let items = Object.entries(emojiReplaceDict)

  const dispatch = createEventDispatcher()

  let list: ListView
  let scrollContainer: HTMLElement
  let selection = 0

  function dispatchItem(item: [string, string]): void {
    dispatch('close', {
      id: item[0],
      objectclass: item[1]
    })
  }

  export function onKeyDown(key: KeyboardEvent): boolean {
    if (key.key === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list?.select(selection + 1)
      return true
    }
    if (key.key === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      if (selection === 0 && scrollContainer !== undefined) {
        scrollContainer.scrollTop = 0
      }
      list?.select(selection - 1)
      return true
    }
    if (key.key === 'Enter' || key.key === 'Tab') {
      key.preventDefault()
      key.stopPropagation()
      if (selection < items.length) {
        const searchItem = items[selection]
        dispatchItem(searchItem)
        return true
      } else {
        return false
      }
    }
    return false
  }

  const updateItems = reduceCalls(async function (localQuery: string): Promise<void> {
    items = Object.entries(emojiReplaceDict).filter(([k, v]) => k.includes(localQuery))
  })
  $: void updateItems(query)
</script>

{#if (items.length === 0 && query !== '') || items.length > 0}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <form class="antiPopup mentionPoup" on:keydown={onKeyDown} use:resizeObserver={() => dispatch('changeSize')}>
    <div class="ap-scroll" bind:this={scrollContainer}>
      <div class="ap-box">
        {#if items.length === 0 && query !== ''}
          <div class="noResults"><Label label={presentation.string.NoResults} /></div>
        {/if}
        {#if items.length > 0}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <ListView bind:this={list} bind:selection count={items.length}>
            <svelte:fragment slot="item" let:item={num}>
              {@const item = items[num]}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="ap-menuItem withComp h-8"
                on:click={() => {
                  dispatchItem(item)
                }}
              >
                <div class="flex-row-center">
                  <div class="flex-center p-1 content-dark-color flex-no-shrink">
                    {item[1]}
                  </div>
                  <span class="ml-1 max-w-120 overflow-label searchResult">
                    <span class="name">{item[0]}</span>
                  </span>
                </div>
              </div>
            </svelte:fragment>
          </ListView>
        {/if}
      </div>
    </div>
    <div class="ap-space x2" />
  </form>
{/if}

<style lang="scss">
  .noResults {
    display: flex;
    padding: 0.25rem 1rem;
    align-items: center;
    align-self: stretch;
  }

  .mentionPoup {
    padding-top: 0.5rem;
  }

  .searchResult {
    display: flex;
    flex-direction: row;

    .name {
      display: flex;
      flex: 1;
    }
  }
</style>
