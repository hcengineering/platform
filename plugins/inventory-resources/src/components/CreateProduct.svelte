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
  import { Account, Doc, generateId, Ref } from '@hcengineering/core'
  import { Category, Product } from '@hcengineering/inventory'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { Button, DropdownLabels, DropdownTextItem, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import inventory from '../plugin'

  const doc: Product = {
    name: '',
    attachedTo: '' as Ref<Doc>,
    attachedToClass: inventory.class.Category,
    _class: inventory.class.Product,
    space: inventory.space.Products,
    _id: generateId(),
    collection: 'products',
    modifiedOn: Date.now(),
    modifiedBy: '' as Ref<Account>
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return doc.attachedTo.length === 0 && doc.name.length === 0
  }

  async function create () {
    const categoryInstance = await client.findOne(inventory.class.Category, { _id: doc.attachedTo as Ref<Category> })
    if (categoryInstance === undefined) {
      throw new Error('category not found')
    }

    await client.addCollection(
      inventory.class.Product,
      doc.space,
      doc.attachedTo,
      categoryInstance._class,
      'products',
      {
        name: doc.name
      }
    )
  }

  let categories: DropdownTextItem[] = []
  const categoriesQ = createQuery()
  $: categoriesQ.query(inventory.class.Category, {}, (result) => {
    categories = result.map((c) => {
      return { id: c._id, label: c.name }
    })
  })
</script>

<Card
  label={inventory.string.CreateProduct}
  okAction={create}
  canSave={doc.name.trim().length > 0 && doc.attachedTo.length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button focusIndex={1} icon={inventory.icon.Products} size={'medium'} kind={'link-bordered'} noFocus />
    </div>
    <EditBox bind:value={doc.name} placeholder={inventory.string.Product} kind={'large-style'} autoFocus />
  </div>
  <svelte:fragment slot="pool">
    <DropdownLabels
      items={categories}
      kind={'regular'}
      size={'large'}
      bind:selected={doc.attachedTo}
      placeholder={inventory.string.Categories}
      label={inventory.string.Category}
    />
  </svelte:fragment>
</Card>
