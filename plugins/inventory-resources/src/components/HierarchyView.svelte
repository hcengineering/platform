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
  import { Class, Doc, DocumentQuery, FindOptions, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, Loading } from '@hcengineering/ui'
  import { buildModel } from '@hcengineering/view-resources'
  import { Category } from '@hcengineering/inventory'
  import HierarchyElement from './HierarchyElement.svelte'
  import { buildConfigLookup } from '@hcengineering/view-resources/src/utils'

  export let _class: Ref<Class<Category>>
  export let query: DocumentQuery<Category> = {}
  export let options: FindOptions<Category> | undefined = undefined
  export let config: string[] = ['', 'modifiedOn']

  let objects: Category[]
  let descendants: Map<Ref<Doc>, Category[]> = new Map<Ref<Doc>, Category[]>()

  const q = createQuery()

  async function update (_class: Ref<Class<Category>>, query: DocumentQuery<Category>, options?: FindOptions<Category>) {
    q.query(
      _class,
      query,
      (result) => {
        objects = result
        updateDescendants()
      },
      { sort: { name: SortingOrder.Ascending }, ...options, limit: 200 }
    )
  }
  $: update(_class, query, options)

  function updateDescendants (): void {
    descendants.clear()
    for (const doc of objects) {
      const current = descendants.get(doc.attachedTo)
      if (!current) {
        descendants.set(doc.attachedTo, [doc])
      } else {
        current.push(doc)
        descendants.set(doc.attachedTo, current)
      }
    }
    descendants = descendants
  }

  const client = getClient()

  $: lookup = buildConfigLookup(client.getHierarchy(), _class, config)
</script>

{#await buildModel({ client, _class, keys: config, lookup })}
  <Loading />
{:then model}
  <table class="table-body">
    <thead>
      <tr class="tr-head">
        {#each model as attribute}
          <th>
            <div class="flex-row-center whitespace-nowrap">
              <Label label={attribute.label} />
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    {#if objects}
      <tbody>
        <HierarchyElement {model} {descendants} />
      </tbody>
    {/if}
  </table>
{/await}

<style lang="scss">
  .table-body {
    width: 100%;
  }

  th {
    height: 2.5rem;
    font-weight: 500;
    font-size: 0.75rem;
    color: var(--dark-color);
    box-shadow: inset 0 -1px 0 0 var(--divider-color);
    user-select: none;
    z-index: 5;
    padding: 0.5rem 1.5rem;
    text-align: left;
    &:first-child {
      padding-left: 2.5rem;
    }
    &:last-child {
      padding-right: 1.5rem;
    }
  }
</style>
