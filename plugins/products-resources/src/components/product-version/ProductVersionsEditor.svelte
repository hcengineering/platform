<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Product } from '@hcengineering/products'
  import { type Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, Label, Scroller, Section, showPopup } from '@hcengineering/ui'
  import { Table, openDoc } from '@hcengineering/view-resources'

  import products from '../../plugin'
  import CreateProductVersion from './CreateProductVersion.svelte'

  export let objectId: Ref<Product>
  export let readonly: boolean = false

  const client = getClient()
  const query = createQuery()

  let versions = 0
  $: objectId &&
    query.query(
      products.class.ProductVersion,
      { space: objectId },
      (res) => {
        versions = res.length
      },
      {
        total: true,
        limit: 1,
        projection: { _id: 1 }
      }
    )

  const createProductVersion = (): void => {
    showPopup(CreateProductVersion, { space: objectId }, 'top', async (id) => {
      if (id != null) {
        const doc = await client.findOne(products.class.ProductVersion, { _id: id })
        if (doc !== undefined) {
          void openDoc(client.getHierarchy(), doc)
        }
      }
    })
  }
</script>

<Section label={products.string.ProductVersions}>
  <svelte:fragment slot="header">
    {#if !readonly}
      <div class="buttons-group xsmall-gap">
        <Button
          id={products.string.CreateProductVersion}
          icon={IconAdd}
          kind={'ghost'}
          on:click={createProductVersion}
        />
      </div>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="content">
    {#if versions > 0}
      <Scroller horizontal>
        <Table
          _class={products.class.ProductVersion}
          config={['', 'state', '$lookup.parent', 'createdBy', 'createdOn']}
          query={{ space: objectId }}
          {readonly}
        />
      </Scroller>
    {:else}
      <div class="antiSection-empty solid flex-col-center mt-3">
        <div class="caption-color">
          <Label label={products.string.NoProductVersions} />
        </div>
        {#if !readonly}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <span class="over-underline content-color" on:click={createProductVersion}>
            <Label label={products.string.CreateProductVersion} />
          </span>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Section>
