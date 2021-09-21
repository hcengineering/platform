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
  import { createEventDispatcher } from 'svelte'
  import type { Ref, Class, Doc, Space, FindOptions } from '@anticrm/core'
  import { buildModel } from '../utils'
  import { getClient } from '@anticrm/presentation'
  import { Label, showPopup, Loading, ScrollBox, CheckBox } from '@anticrm/ui'
  import MoreV from './icons/MoreV.svelte'

  import { createQuery } from '@anticrm/presentation'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space>
  export let options: FindOptions<Doc> | undefined
  export let config: string[]
  export let search: string

  let objects: Doc[]

  const query = createQuery()
  $: query.query(_class, search === '' ? { space } : { $search: search }, result => { objects = result }, options)

  function getValue(doc: Doc, key: string): any {
    if (key.length === 0)
      return doc
    const path = key.split('.')
    const len = path.length
    let obj = doc as any
    for (let i=0; i<len; i++){
      obj = obj?.[path[i]]
    }
    return obj
  }

  const client = getClient()
  let checking: boolean = false
</script>

{#await buildModel(client, _class, config, options)}
 <Loading/>
{:then model}
<div class="container">
  <ScrollBox vertical stretch noShift>
    <table class="table-body">
      <thead>
        <tr class="tr-head">
          {#each model as attribute, cellHead}
            <th class:checkall={checking}>
              {#if !cellHead}
                <div class="firstCell">
                  <div class="control"><CheckBox symbol={'minus'} /></div>
                  <span><Label label = {attribute.label}/></span>
                </div>
              {:else}
                <Label label = {attribute.label}/>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      {#if objects}
        <tbody>
          {#each objects as object (object._id)}
            <tr class="tr-body" class:checking>
              {#each model as attribute, cell}
                <td>
                  {#if !cell}
                    <div class="firstCell">
                      <div class="control">
                        <CheckBox bind:checked={checking} />
                        <div class="moveRow"><MoreV /></div>
                      </div>
                      <svelte:component this={attribute.presenter} value={getValue(object, attribute.key)}/>
                    </div>
                  {:else}
                    <svelte:component this={attribute.presenter} value={getValue(object, attribute.key)}/>
                  {/if}
                </td>
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
  .firstCell {
    display: flex;
    align-items: center;
    flex-grow: 1;
    .control {
      visibility: hidden;
      display: flex;
      align-items: center;
      width: 0;
      .moveRow {
        visibility: hidden;
        width: 1rem;
        margin: 0 .5rem;
        cursor: pointer;
      }
    }
  }

  th, td {
    padding: .5rem 1.5rem;
    text-align: left;
    &:first-child {
      padding-left: 2.5rem;
      padding-right: 3rem;
    }
  }

  th {
    position: sticky;
    top: 0;
    height: 2.5rem;
    font-weight: 500;
    font-size: .75rem;
    color: var(--theme-content-dark-color);
    background-color: var(--theme-bg-color);
    box-shadow: inset 0 -1px 0 0 var(--theme-bg-focused-color);
    z-index: 5;

    &:first-child.checkall {
      padding-left: 1rem;
      & .control {
        visibility: visible;
        width: auto;
      }
      span { margin-left: 2rem; }
    }
  }

  .tr-body {
    height: 3.25rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);
    &:hover, &.checking {
      background-color: var(--theme-table-bg-hover);
      & td:first-child {
        padding-left: 1rem;
        padding-right: 1.5rem;
        & .control {
          visibility: visible;
          width: auto;
        }
      }
    }
    &:hover td:first-child .control .moveRow { visibility: visible; }
  }
</style>
