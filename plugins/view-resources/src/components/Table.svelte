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
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import { SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Component, CheckBox, IconDown, IconUp, Label, Loading, showPopup, Spinner } from '@anticrm/ui'
  import { BuildModelKey } from '@anticrm/view'
  import { buildModel, LoadingProps } from '../utils'
  import MoreV from './icons/MoreV.svelte'
  import Menu from './Menu.svelte'
  import notification from '@anticrm/notification'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let enableChecking: boolean = false
  export let showNotification: boolean = false
  export let highlightRows: boolean = false
  export let options: FindOptions<Doc> | undefined = undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined = undefined
  export let config: (BuildModelKey | string)[]

  // If defined, will show a number of dummy items before real data will appear.
  export let loadingProps: LoadingProps | undefined = undefined

  let sortKey = 'modifiedOn'
  let sortOrder = SortingOrder.Descending
  let selectRow: number | undefined = undefined
  let loading = false

  let objects: Doc[]

  const q = createQuery()

  const dispatch = createEventDispatcher()

  $: sortingFunction = (config.find(it => (typeof it !== 'string') && it.sortingKey === sortKey) as BuildModelKey)?.sortingFunction

  let qindex = 0
  async function update (
    _class: Ref<Class<Doc>>,
    query: DocumentQuery<Doc>,
    sortKey: string,
    sortOrder: SortingOrder,
    options?: FindOptions<Doc>
  ) {
    const c = ++qindex
    loading = true
    q.query(
      _class,
      query,
      (result) => {
        if (c !== qindex) {
          return // our data is invalid.
        }
        objects = result
        if (sortingFunction !== undefined) {
          const sf = sortingFunction
          objects.sort((a, b) => -1 * sortOrder * sf(a, b))
        }
        dispatch('content', objects)
        loading = false
      },
      { sort: { [sortKey]: sortOrder }, ...options, limit: 200 }
    )
  }
  $: update(_class, query, sortKey, sortOrder, options)

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

  const showMenu = async (ev: MouseEvent, object: Doc, row: number): Promise<void> => {
    selectRow = row
    showPopup(Menu, { object, baseMenuClass }, ev.target as HTMLElement, () => {
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

  let checked: Set<Ref<Doc>> = new Set<Ref<Doc>>()

  function check (id: Ref<Doc>, e: Event) {
    if (!enableChecking) return
    const target = e.target as HTMLInputElement
    const value = target.checked
    if (value) {
      checked.add(id)
    } else {
      checked.delete(id)
    }
    checked = checked
  }

  function getLoadingLength (props: LoadingProps, options?: FindOptions<Doc>): number {
    if (options?.limit !== undefined && options?.limit > 0) {
      return Math.min(options?.limit, props.length)
    }
    return props.length
  }
</script>

{#await buildModel({ client, _class, keys: config, options })}
  {#if !loading}
    <Loading />
  {/if}
{:then model}
  <table class="antiTable" class:metaColumn={enableChecking || showNotification} class:highlightRows>
    <thead class="scroller-thead">
      <tr class="scroller-thead__tr">
        {#if enableChecking || showNotification}
          <th>
            {#if enableChecking && objects?.length > 0}
              <div class="antiTable-cells__checkCell" class:checkall={checked.size > 0}>
                <CheckBox
                  symbol={'minus'}
                  checked={objects?.length === checked.size && objects?.length > 0}
                  on:change={(e) => {
                    objects.map((o) => check(o._id, e))
                  }}
                />
              </div>
            {/if}
          </th>
        {/if}
        {#each model as attribute}
          <th
            class:sortable={attribute.sortingKey}
            class:sorted={attribute.sortingKey === sortKey}
            on:click={() => changeSorting(attribute.sortingKey)}
          >
            <div class="antiTable-cells">
              <Label label={attribute.label} />
              {#if attribute.sortingKey === sortKey}
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
          <tr class="antiTable-body__row" class:checking={checked.has(object._id)} class:fixed={row === selectRow}>
            {#each model as attribute, cell}
              {#if !cell}
                {#if enableChecking || showNotification}
                  <td class="relative">
                    {#if showNotification}
                      <div class="antiTable-cells__notifyCell">
                        {#if enableChecking}
                          <div class="antiTable-cells__checkCell">
                            <CheckBox
                              checked={checked.has(object._id)}
                              on:change={(e) => {
                                check(object._id, e)
                              }}
                            />
                          </div>
                        {/if}
                        <Component is={notification.component.NotificationPresenter} props={{ value: object, kind: enableChecking ? 'table' : 'block' }} />
                      </div>
                    {:else}
                      <div class="antiTable-cells__checkCell">
                        <CheckBox
                          checked={checked.has(object._id)}
                          on:change={(e) => {
                            check(object._id, e)
                          }}
                        />
                      </div>
                    {/if}
                  </td>
                {/if}
                <td>
                  <div class="antiTable-cells__firstCell">
                    <svelte:component
                      this={attribute.presenter}
                      value={getValue(object, attribute.key)}
                      {...attribute.props}
                    />
                    <div id='context-menu' class="antiTable-cells__firstCell-menuRow" on:click={(ev) => showMenu(ev, object, row)}>
                      <MoreV size={'small'} />
                    </div>
                  </div>
                </td>
              {:else}
                <td>
                  <svelte:component
                    this={attribute.presenter}
                    value={getValue(object, attribute.key)}
                    {...attribute.props}
                  />
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    {:else if loadingProps !== undefined}
      <tbody>
        {#each Array(getLoadingLength(loadingProps, options)) as i, row}
          <tr class="antiTable-body__tr" class:fixed={row === selectRow}>
            {#each model as attribute, cell}
              {#if !cell}
                {#if enableChecking}
                  <td>
                    <div class="antiTable-cells__checkCell">
                      <CheckBox
                        checked={false}
                      />
                    </div>
                  </td>
                {/if}
                <td>
                  <Spinner size="small" />
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    {/if}
  </table>
{/await}

{#if loading}
  <Loading />
{/if}
