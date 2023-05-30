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
  import { Account, generateId, Ref } from '@hcengineering/core'
  import { Card, getClient } from '@hcengineering/presentation'
  import { EditBox, Grid } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import inventory from '../plugin'
  import { Product, Variant } from '@hcengineering/inventory'

  export let product: Ref<Product>

  const doc: Variant = {
    name: '',
    sku: '',
    attachedTo: product,
    attachedToClass: inventory.class.Product,
    _class: inventory.class.Variant,
    space: inventory.space.Products,
    _id: generateId(),
    collection: 'variants',
    modifiedOn: Date.now(),
    modifiedBy: '' as Ref<Account>
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  export function canClose (): boolean {
    return doc.attachedTo.length === 0 && doc.name.length === 0
  }

  async function create () {
    const productInstance = await client.findOne(inventory.class.Product, { _id: doc.attachedTo as Ref<Product> })
    if (productInstance === undefined) {
      throw new Error('product not found')
    }

    await client.addCollection(inventory.class.Variant, doc.space, doc.attachedTo, productInstance._class, 'variants', {
      name: doc.name,
      sku: doc.sku
    })
  }
</script>

<Card
  label={inventory.string.CreateVariant}
  okAction={create}
  canSave={doc.name.trim().length > 0 && doc.sku.trim().length > 0}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <Grid column={1} rowGap={1.75}>
    <EditBox label={inventory.string.Variant} bind:value={doc.name} placeholder={inventory.string.Variant} autoFocus />
    <EditBox label={inventory.string.SKU} bind:value={doc.sku} placeholder={inventory.string.SKU} />
  </Grid>
</Card>
