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
  import core, { SearchResultDoc, Ref, Class, Doc } from '@hcengineering/core'
  import presentation, {
    SearchResult,
    reduceCalls,
    searchFor,
    type SearchItem,
    getClient
  } from '@hcengineering/presentation'
  import { Label, ListView, resizeObserver } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '@hcengineering/contact'
  import { getReferenceLabel, getReferenceObject } from './extension/reference'
  import { translate } from '@hcengineering/platform'

  export let query: string = ''
  export let multipleMentions: boolean = false
  export let docClass: Ref<Class<Doc>> | undefined = undefined

  let items: SearchItem[] = []

  const dispatch = createEventDispatcher()
  const client = getClient()

  let list: ListView
  let scrollContainer: HTMLElement
  let selection = 0

  const employeeSearchCategory = client
    .getModel()
    .findAllSync(presentation.class.ObjectSearchCategory, { classToSearch: contact.mixin.Employee })[0]

  async function getMultipleEmployeeSearchItems (localQuery: string, lastIndex: number): Promise<SearchItem[]> {
    if (!multipleMentions) return []
    const clazz =
      docClass && client.getHierarchy().hasClass(docClass) ? client.getHierarchy().getClass(docClass) : undefined
    const docTitle = await translate(clazz?.label ?? core.string.Object, {})

    const everyoneDescription = await translate(contact.string.EveryoneDescription, {
      title: docTitle.toLowerCase()
    })
    const hereDescription = await translate(contact.string.HereDescription, {
      title: docTitle.toLowerCase()
    })
    const everyoneTitle = await translate(contact.string.Everyone, {})
    const hereTitle = await translate(contact.string.Here, {})
    return [
      {
        num: 0,
        category: employeeSearchCategory,
        item: {
          id: contact.mention.Everyone,
          title: everyoneTitle,
          description: everyoneDescription,
          emojiIcon: '📢',
          doc: {
            _id: contact.mention.Everyone,
            _class: contact.mixin.Employee
          }
        }
      },
      {
        num: 0,
        category: employeeSearchCategory,
        item: {
          id: contact.mention.Here,
          title: hereTitle,
          description: hereDescription,
          emojiIcon: '📢',
          doc: {
            _id: contact.mention.Here,
            _class: contact.mixin.Employee
          }
        }
      }
    ]
      .filter((it) => it.item.title.toLowerCase().includes(localQuery.toLowerCase()))
      .map((it, idx) => ({ ...it, num: lastIndex + 1 + idx }))
  }

  async function handleSelectItem (item: SearchResultDoc): Promise<void> {
    if ([contact.mention.Here, contact.mention.Everyone].includes(item.id as any)) {
      dispatch('close', {
        id: item.doc._id,
        label: item.title?.toLowerCase() ?? '',
        objectclass: item.doc._class
      })
      return
    }

    const obj = (await getReferenceObject(item.doc._class, item.doc._id)) ?? item.doc
    const label = await getReferenceLabel(obj._class, obj._id)
    dispatch('close', {
      id: obj._id,
      label,
      objectclass: obj._class
    })
  }

  export function onKeyDown (key: KeyboardEvent): boolean {
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
        void handleSelectItem(searchItem.item)
        return true
      } else {
        return false
      }
    }
    return false
  }

  const updateItems = reduceCalls(async function (localQuery: string): Promise<void> {
    const r = await searchFor('mention', localQuery)
    if (r.query === query) {
      const latestIndex = r.items.findLastIndex((it) => it.category.classToSearch === contact.mixin.Employee)
      const multipleEmployeeSearchItems = await getMultipleEmployeeSearchItems(localQuery, latestIndex)

      items =
        latestIndex === -1
          ? [...multipleEmployeeSearchItems, ...r.items]
          : [...r.items.slice(0, latestIndex + 1), ...multipleEmployeeSearchItems, ...r.items.slice(latestIndex + 1)]
    }
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
            <svelte:fragment slot="category" let:item={num}>
              {@const item = items[num]}
              {#if item.num === 0}
                <div class="mentonCategory">
                  <Label label={item.category.title} />
                </div>
              {/if}
            </svelte:fragment>
            <svelte:fragment slot="item" let:item={num}>
              {@const item = items[num]}
              {@const doc = item.item}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="ap-menuItem withComp h-8"
                on:click={() => {
                  void handleSelectItem(doc)
                }}
              >
                <SearchResult value={doc} />
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

  .mentonCategory {
    padding: 0.5rem 1rem;
    font-size: 0.625rem;
    letter-spacing: 0.0625rem;
    color: var(--theme-dark-color);
    text-transform: uppercase;
    line-height: 1rem;
  }
</style>
