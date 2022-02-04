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
  import { Account, generateId, Ref, Doc } from '@anticrm/core'
  import { Card, createQuery, getClient } from '@anticrm/presentation'
  import { DropdownLabels, EditBox, Grid } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import inventory from '../plugin'
  import { Category, Product } from '@anticrm/inventory'
  import { DropdownTextItem } from '@anticrm/ui/src/types'

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
  bind:space={doc.space}
  on:close={() => {
    dispatch('close')
  }}
>
  <Grid column={1} rowGap={1.75}>
    <EditBox
      label={inventory.string.Product}
      icon={inventory.icon.Products}
      bind:value={doc.name}
      placeholder={inventory.string.Product}
      maxWidth={'16rem'}
      focus
    />
    <DropdownLabels
      header
      items={categories}
      bind:selected={doc.attachedTo}
      caption={inventory.string.Categories}
      title={inventory.string.Category}
    />
  </Grid>
</Card>
