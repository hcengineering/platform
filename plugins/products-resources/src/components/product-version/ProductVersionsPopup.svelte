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
  import type { Product, ProductVersion } from '@hcengineering/products'
  import core, { FindOptions, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label, Loading } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { DocNavLink, ObjectPresenter, Table } from '@hcengineering/view-resources'
  import products from '../../plugin'

  export let value: Product

  const options: FindOptions<ProductVersion> = {
    sort: {
      modifiedOn: SortingOrder.Descending
    },
    limit: 200
  }

  let viewlet: Viewlet | undefined
  let preference: ViewletPreference | undefined
  let loading = true

  const viewletQuery = createQuery()
  $: viewletQuery.query(view.class.Viewlet, { _id: products.viewlet.TableProductVersion }, (res) => {
    ;[viewlet] = res
  })

  const preferenceQuery = createQuery()

  $: viewlet !== undefined &&
    preferenceQuery.query(
      view.class.ViewletPreference,
      {
        space: core.space.Workspace,
        attachedTo: viewlet._id
      },
      (res) => {
        preference = res[0]
        loading = false
      },
      { limit: 1 }
    )
</script>

<div class="flex flex-between flex-grow p-1 mb-4">
  <div class="fs-title">
    <Label label={products.string.ProductVersions} />
  </div>
  <DocNavLink object={value}>
    <ObjectPresenter _class={value._class} objectId={value._id} {value} />
  </DocNavLink>
</div>
<div class="popup-table">
  {#if viewlet !== undefined && !loading}
    <Table
      _class={products.class.ProductVersion}
      config={preference?.config ?? viewlet.config}
      query={{ attachedTo: value._id }}
      {options}
      loadingProps={{ length: value.versions ?? 0 }}
    />
  {:else}
    <Loading />
  {/if}
</div>

<style lang="scss">
  .popup-table {
    overflow: auto;
    max-height: 30rem;
  }
</style>
