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
  import { Label, showPopup, Loading, ScrollBox } from '@anticrm/ui'
  import type { AnyComponent } from '@anticrm/ui'

  import { createQuery } from '@anticrm/presentation'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space>
  export let open: AnyComponent
  export let options: FindOptions<Doc> | undefined
  export let config: string[]

  let objects: Doc[]

  const query = createQuery()
  $: query.query(_class, { space }, result => { objects = result }, options)

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

  function onClick(object: Doc) {
    showPopup(open, { object, space }, 'float')
  }
</script>

{#await buildModel(client, _class, config, options)}
 <Loading/>
{:then model}
<div class="container">
  <ScrollBox vertical stretch noShift>
    <table class="table-body">
      <thead>
        <tr class="tr-head">
          {#each model as attribute}
            <th><Label label = {attribute.label}/></th>
          {/each}
        </tr>
      </thead>
      {#if objects}
        <tbody>
          {#each objects as object (object._id)}
            <tr class="tr-body" on:click={() => onClick(object)}>
            {#each model as attribute}
              <td><svelte:component this={attribute.presenter} {object} value={getValue(object, attribute.key)}/></td>
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

    &::before {
      position: absolute;
      content: '';
      top: 2.5rem;
      bottom: 0;
      width: 100%;
      background-color: var(--theme-table-bg-color);
      border-radius: 0 0 1.25rem 1.25rem;
    }
  }

  th, td {
    padding: .5rem 1.5rem;
    text-align: left;
    &:first-child { padding-left: 2.5rem; }
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
  }

  .tr-body {
    height: 3.75rem;
    color: var(--theme-caption-color);
    border-bottom: 1px solid var(--theme-button-border-hovered);
    &:last-child { border-bottom: none; }
    &:hover { background-color: var(--theme-table-bg-hover); }
  }
</style>
