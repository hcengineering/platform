<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import { Doc, Ref } from '@anticrm/core'
  import { IconMoreV, showPopup } from '@anticrm/ui'
  import { AttributeModel } from '@anticrm/view'
  import inventory, { Category } from '@anticrm/inventory'
  import HierarchyElement from './HierarchyElement.svelte'
  import { ContextMenu } from '@anticrm/view-resources'
  import Expand from './icons/Expand.svelte'
  import Collapse from './icons/Collapse.svelte'

  export let descendants: Map<Ref<Doc>, Category[]>
  export let level: number = 1
  export let model: AttributeModel[]
  export let parent: Ref<Doc> = inventory.global.Category
  let expanded: Set<Ref<Category>> = new Set<Ref<Category>>()

  function getValue (doc: Category, key: string): any {
    if (key.length === 0) {
      return doc
    }
    const path = key.split('.')
    const len = path.length
    let obj = doc as any
    for (let i = 0; i < len; i++) {
      obj = obj?.[path[i]]
    }
    return obj ?? ''
  }

  const showMenu = async (ev: MouseEvent, object: Category): Promise<void> => {
    showPopup(ContextMenu, { object }, ev.target as HTMLElement)
  }

  function click (id: Ref<Category>): void {
    if (!descendants.has(id)) return
    if (expanded.has(id)) {
      expanded.delete(id)
    } else {
      expanded.add(id)
    }
    expanded = expanded
  }

  $: style = `margin-left: ${level * 1.5}rem;`
</script>

{#each descendants.get(parent) ?? [] as object, row (object._id)}
  <tr class="tr-body">
    {#each model as attribute, cell}
      {#if !cell}
        <td>
          <div class="firstCell" {style}>
            {#if descendants.has(object._id)}
              <div class="expand" on:click={(ev) => click(object._id)}>
                {#if expanded.has(object._id)}
                  <Expand size={'small'} />
                {:else}
                  <Collapse size={'small'} />
                {/if}
              </div>
            {/if}
            <svelte:component this={attribute.presenter} value={getValue(object, attribute.key)} {...attribute.props} />
            <div class="menuRow" on:click={(ev) => showMenu(ev, object)}><IconMoreV size={'small'} /></div>
          </div>
        </td>
      {:else}
        <td>
          <svelte:component this={attribute.presenter} value={getValue(object, attribute.key)} {...attribute.props} />
        </td>
      {/if}
    {/each}
  </tr>
  {#if expanded.has(object._id)}
    <HierarchyElement {descendants} {model} level={level + 1} parent={object._id} />
  {/if}
{/each}

<style lang="scss">
  .firstCell {
    display: flex;
    align-items: center;
    .menuRow {
      visibility: hidden;
      margin-left: 0.5rem;
    }
    .expand {
      margin-left: -1.5rem;
      margin-right: 0.5rem;
    }
    .expand,
    .menuRow {
      opacity: 0.6;
      cursor: pointer;
      &:hover {
        opacity: 1;
      }
    }
  }
  td {
    padding: 0.5rem 1.5rem;
    text-align: left;
    &:first-child {
      padding-left: 2.5rem;
    }
    &:last-child {
      padding-right: 1.5rem;
    }
  }

  .tr-body {
    height: 3.25rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);
    &:hover .firstCell .menuRow {
      visibility: visible;
    }
    &:last-child {
      border-bottom: none;
    }
    &:hover {
      background-color: var(--theme-table-bg-hover);
    }
  }
</style>
