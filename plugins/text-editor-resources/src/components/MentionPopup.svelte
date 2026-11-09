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
  import contact from '@hcengineering/contact'
  import core, { Class, Doc, Ref, SearchResultDoc, SortingOrder, type VersionableDoc } from '@hcengineering/core'
  import { getResource, translate } from '@hcengineering/platform'
  import presentation, {
    getClient,
    reduceCalls,
    searchFor,
    SearchResult,
    type SearchItem
  } from '@hcengineering/presentation'
  import { Label, ListView, resizeObserver, Submenu } from '@hcengineering/ui'
  import view, { type ReferenceVersion, type ReferenceVersionsProvider } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { getReferenceLabel, getReferenceObject } from './extension/reference'

  import MentionVersionPopup from './MentionVersionPopup.svelte'

  export let query: string = ''
  export let multipleMentions: boolean = false
  export let docClass: Ref<Class<Doc>> | undefined = undefined

  let items: SearchItem[] = []

  function getReferenceVersionsProvider (doc: SearchResultDoc['doc']): ReferenceVersionsProvider | undefined {
    return client.getHierarchy().classHierarchyMixin(doc._class, view.mixin.ReferenceVersionsProvider)
  }

  function getVersionableDoc (doc: SearchResultDoc['doc']): VersionableDoc | undefined {
    const enabled = client.getHierarchy().classHierarchyMixin(doc._class, core.mixin.VersionableClass)?.enabled
    if (enabled !== true) return

    const versionedDoc = doc as VersionableDoc
    if (versionedDoc.baseId === undefined) return
    if (versionedDoc.isLatest === true && versionedDoc.baseId === versionedDoc._id) return
    return versionedDoc
  }

  function hasReferenceVersions (doc: SearchResultDoc['doc']): boolean {
    return getReferenceVersionsProvider(doc) !== undefined || getVersionableDoc(doc) !== undefined
  }

  async function getReferenceVersions (doc: SearchResultDoc['doc']): Promise<ReferenceVersion[]> {
    const provider = getReferenceVersionsProvider(doc)
    if (provider !== undefined) {
      const providerFn = await getResource(provider.provider)
      return await providerFn(client, doc._id)
    }

    const versionedDoc = getVersionableDoc(doc)
    if (versionedDoc === undefined) return []

    const versions = await client.findAll(
      doc._class,
      { baseId: versionedDoc.baseId } as any,
      { sort: { version: SortingOrder.Descending } } as any
    )

    return await Promise.all(
      versions.map(async (version) => ({
        id: version._id,
        objectclass: version._class,
        label: await getReferenceLabel(version._class, version._id, version),
        fixed: true
      }))
    )
  }

  async function getLatestReference (item: SearchResultDoc): Promise<ReferenceVersion> {
    return {
      id: item.doc._id,
      objectclass: item.doc._class,
      label: await getReferenceLabel(item.doc._class, item.doc._id)
    }
  }

  function selectReference (props: ReferenceVersion): void {
    dispatch('close', props)
  }

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
    if (employeeSearchCategory === undefined) return []

    const clazz =
      docClass != null && client.getHierarchy().hasClass(docClass)
        ? client.getHierarchy().getClass(docClass)
        : undefined
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

    if (getReferenceVersionsProvider(item.doc) !== undefined) {
      dispatch('close', await getLatestReference(item))
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
              {#if hasReferenceVersions(doc.doc)}
                <Submenu
                  withoutMargin
                  withHover
                  props={{
                    latest: {
                      id: doc.doc._id,
                      objectclass: doc.doc._class,
                      label: doc.title ?? ''
                    },
                    versions: getReferenceVersions(doc.doc),
                    onSelect: selectReference
                  }}
                  options={{ component: MentionVersionPopup }}
                >
                  <div slot="item" class="mention-version-item">
                    <SearchResult value={doc} />
                  </div>
                </Submenu>
              {:else}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                  class="ap-menuItem withComp h-8"
                  on:click={() => {
                    void handleSelectItem(doc)
                  }}
                >
                  <SearchResult value={doc} />
                </div>
              {/if}
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

  .mention-version-item {
    display: flex;
    align-items: center;
    height: 2rem;
    min-width: 0;
    width: 100%;
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
