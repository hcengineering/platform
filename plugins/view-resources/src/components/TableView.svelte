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
  import type { Class, Doc, FindOptions, Ref, Space } from '@anticrm/core'
  import { SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { CheckBox, IconDown, IconUp, Label, Loading, ScrollBox, showPopup } from '@anticrm/ui'
  import { buildModel } from '../utils'
  import MoreV from './icons/MoreV.svelte'
  import Menu from './Menu.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space>
  export let options: FindOptions<Doc> | undefined
  export let config: string[]
  export let search: string

  let sortKey = 'modifiedOn'
  let sortOrder = SortingOrder.Descending
  let selectRow: number | undefined = undefined

  let objects: Doc[]

  const query = createQuery()
  $: query.query(
    _class,
    search === '' ? { space } : { $search: search },
    (result) => {
      objects = result
    },
    { sort: { [sortKey]: sortOrder }, ...options }
  )

  function getValue (doc: Doc, key: string): any {
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

  const client = getClient()
  let checked: Set<Ref<Doc>> = new Set<Ref<Doc>>()

  const showMenu = (ev: MouseEvent, object: Doc, row: number): void => {
    selectRow = row
    showPopup(Menu, { object }, ev.target as HTMLElement, () => {
      selectRow = undefined
    })
  }

  function changeSorting (key: string): void {
    if (key === '') {
      return
    }
    if (key !== sortKey) {
      sortKey = key
      sortOrder = SortingOrder.Ascending
    } else {
      sortOrder = sortOrder === SortingOrder.Ascending ? SortingOrder.Descending : SortingOrder.Ascending
    }
  }

  function check (id: Ref<Doc>, e: Event) {
    const target = e.target as HTMLInputElement
    const value = target.checked
    if (value) {
      checked.add(id)
    } else {
      checked.delete(id)
    }
    checked = checked
  }
</script>

{#await buildModel({ client, _class, keys: config, options })}
  <Loading />
{:then model}
  <div class="container">
    <ScrollBox vertical stretch noShift>
      <table class="table-body">
        <thead>
          <tr class="tr-head">
            {#each model as attribute, cellHead}
              {#if !cellHead}
                <th>
                  <div class="checkCell" class:checkall={checked.size > 0}>
                    <CheckBox
                      symbol={'minus'}
                      checked={objects.length === checked.size}
                      on:change={(e) => {
                        objects.map((o) => check(o._id, e))
                      }}
                    />
                  </div>
                </th>
              {/if}
              <th
                class:sortable={attribute.key}
                class:sorted={attribute.key === sortKey}
                on:click={() => changeSorting(attribute.key)}
              >
                <div class="flex-row-center">
                  <Label label={attribute.label} />
                  {#if attribute.key === sortKey}
                    <div class="icon">
                      {#if sortOrder === SortingOrder.Ascending}
                        <IconUp size={'small'} />
                      {:else}
                        <IconDown size={'small'} />
                      {/if}
                    </div>
                  {/if}
                </div>
              </th>
            {/each}
          </tr>
        </thead>
        {#if objects}
          <tbody>
            {#each objects as object, row (object._id)}
              <tr class="tr-body" class:checking={checked.has(object._id)} class:fixed={row === selectRow}>
                {#each model as attribute, cell}
                  {#if !cell}
                    <td
                      ><div class="checkCell">
                        <CheckBox
                          checked={checked.has(object._id)}
                          on:change={(e) => {
                            check(object._id, e)
                          }}
                        />
                      </div></td
                    >
                    <td
                      ><div class="firstCell">
                        <svelte:component
                          this={attribute.presenter}
                          value={getValue(object, attribute.key)}
                          {...attribute.props}
                        />
                        <div class="menuRow" on:click={(ev) => showMenu(ev, object, row)}><MoreV size={'small'} /></div>
                      </div></td
                    >
                  {:else}
                    <td
                      ><svelte:component
                        this={attribute.presenter}
                        value={getValue(object, attribute.key)}
                        {...attribute.props}
                      /></td
                    >
                  {/if}
                {/each}
              </tr>
            {/each}
          </tbody>
        {/if}
      </table>
    </ScrollBox>
  </div>
{/await}

<style lang="scss">
  .container {
    flex-grow: 1;
    position: relative;
    padding-bottom: 2.5rem;
    height: 100%;
  }

  .table-body {
    width: 100%;
  }

  .firstCell {
    display: flex;
    // justify-content: space-between;
    align-items: center;
    .menuRow {
      visibility: hidden;
      margin-left: 0.5rem;
      opacity: 0.6;
      cursor: pointer;
      &:hover {
        opacity: 1;
      }
    }
  }
  .checkCell {
    visibility: hidden;
    display: flex;
    align-items: center;
  }

  th,
  td {
    padding: 0.5rem 1.5rem;
    text-align: left;
    &:first-child {
      padding: 0 0.75rem;
      width: 2.5rem;
    }
    &:nth-child(2) {
      padding-left: 0;
      // padding-right: 0;
    }
  }

  th {
    position: sticky;
    top: 0;
    height: 2.5rem;
    font-weight: 500;
    font-size: 0.75rem;
    color: var(--theme-content-dark-color);
    background-color: var(--theme-bg-color);
    box-shadow: inset 0 -1px 0 0 var(--theme-bg-focused-color);
    user-select: none;
    z-index: 5;

    &.sortable {
      cursor: pointer;
    }
    &.sorted .icon {
      margin-left: 0.25rem;
      opacity: 0.6;
    }
    &:hover {
      .checkCell {
        visibility: visible;
      }
    }
    .checkall {
      visibility: visible;
    }
  }

  .tr-body {
    height: 3.25rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);
    &:hover,
    &.checking {
      background-color: var(--theme-table-bg-hover);
      .checkCell {
        visibility: visible;
      }
    }
    &:hover .firstCell .menuRow {
      visibility: visible;
    }
    &:last-child {
      border-bottom: none;
    }
  }

  .fixed {
    background-color: var(--theme-table-bg-hover);
    .checkCell {
      visibility: visible;
    }
    .menuRow {
      visibility: visible;
    }
  }
</style>
