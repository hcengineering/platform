<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import { createQuery } from '@hcengineering/presentation'
  import { MessageTemplate, TemplateCategory } from '@hcengineering/templates'
  import { TextEditorHandler } from '@hcengineering/text-editor'
  import { closePopup, deviceOptionsStore, EditWithIcon, IconSearch } from '@hcengineering/ui'
  import { groupBy } from '@hcengineering/view-resources'
  import templates from '../plugin'
  import { getTemplateDataProvider } from '../utils'

  export let editor: TextEditorHandler
  let items: MessageTemplate[] = []
  let groups: TemplateCategory[] = []

  let query: string = ''

  const liveQuery = createQuery()
  const catQuery = createQuery()

  $: catQuery.query(templates.class.TemplateCategory, {}, (res) => {
    res.sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
    groups = res
  })

  $: groupedDocs = groupBy(items, 'space')

  $: liveQuery.query(templates.class.MessageTemplate, query.trim().length === 0 ? {} : { $search: query }, (res) => {
    items = res
  })

  let selected = 0

  const provider = getTemplateDataProvider()
  async function dispatchItem (item: MessageTemplate): Promise<void> {
    const message = await provider.fillTemplate(item.message)
    editor.insertTemplate(item.title, message)
    closePopup()
  }

  export function onKeyDown (ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') {
      if (selected < items.length - 1) selected++
      return true
    }
    if (ev.key === 'ArrowUp') {
      if (selected > 0) selected--
      return true
    }
    if (ev.key === 'Enter') {
      const item = items[selected]
      if (item) {
        dispatchItem(item)
        return true
      } else {
        return false
      }
    }
    // TODO: How to prevent Esc, it should hide popup instead of closing editor.
    if (ev.key === 'Esc') {
      return false
    }
    return false
  }

  function getInitIndex (groups: TemplateCategory[], i: number): number {
    let res = 0
    for (let index = 0; index < i; index++) {
      const cat = groups[index]
      res += groupedDocs[cat._id]?.length ?? 0
    }
    return res
  }
</script>

<svelte:window on:keydown={onKeyDown} />
<div class="antiPopup template-popup">
  <div class="mt-4 mb-4">
    <EditWithIcon
      icon={IconSearch}
      bind:value={query}
      placeholder={templates.string.SearchTemplate}
      autoFocus={!$deviceOptionsStore.isMobile}
    />
  </div>
  <div class="scroll mt-2">
    {#each groups as group, gi}
      {@const templates = groupedDocs[group._id]}
      {@const initIndex = getInitIndex(groups, gi)}
      {#if templates?.length}
        <b>{group.name}</b>
        {#each templates as item, i}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="item"
            class:selected={initIndex + i === selected}
            on:click={() => {
              dispatchItem(item)
            }}
            on:focus={() => {
              selected = initIndex + i
            }}
            on:mouseover={() => {
              selected = initIndex + i
            }}
          >
            {item.title}
          </div>
        {/each}
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .template-popup {
    width: 19.75rem;
    height: 18.5rem;
    padding: 16px;
    background: var(--popup-bg-color);

    .selected {
      background: var(--popup-bg-hover);
    }

    .scroll {
      max-height: calc(300px - 128px);
      display: grid;
      grid-auto-flow: row;
      gap: 12px;
      overflow-y: auto;

      .item {
        padding: 5px;
      }
    }
  }
</style>
