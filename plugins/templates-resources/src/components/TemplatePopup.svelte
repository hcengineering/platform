<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { MessageTemplate } from '@hcengineering/templates'
  import { TextEditorHandler } from '@hcengineering/text-editor'
  import { closePopup, EditWithIcon, IconSearch, Label, deviceOptionsStore } from '@hcengineering/ui'
  import templates from '../plugin'
  import { getTemplateDataProvider } from '../utils'

  export let editor: TextEditorHandler
  let items: MessageTemplate[] = []

  let query: string = ''

  const liveQuery = createQuery()

  $: liveQuery.query(templates.class.MessageTemplate, query.trim().length === 0 ? {} : { $search: query }, (res) => {
    items = res
  })

  let selected = 0

  const provider = getTemplateDataProvider()
  async function dispatchItem (item: MessageTemplate): Promise<void> {
    const message = await provider.fillTemplate(item.message)
    editor.insertText(message)
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
</script>

<svelte:window on:keydown={onKeyDown} />
<div class="antiPopup template-popup">
  <div class="mt-4 mb-4">
    <EditWithIcon
      icon={IconSearch}
      bind:value={query}
      placeholder={templates.string.SearchTemplate}
      focus={!$deviceOptionsStore.isMobile}
    />
  </div>
  <Label label={templates.string.Suggested} />
  <div class="scroll mt-2">
    {#each items as item, i}
      <div
        class="item"
        class:selected={i === selected}
        on:click={() => {
          dispatchItem(item)
        }}
        on:focus={() => {
          selected = i
        }}
        on:mouseover={() => {
          selected = i
        }}
      >
        {item.title}
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .template-popup {
    width: 19.75rem;
    height: 18.5rem;
    padding: 16px;
    background-color: var(--theme-button-bg-hovered);

    .selected {
      background-color: var(--theme-button-bg-focused);
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
