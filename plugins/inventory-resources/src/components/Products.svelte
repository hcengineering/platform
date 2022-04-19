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
  import ui, { Button, EditWithIcon, Icon, IconSearch, Label, Scroller, showPopup, IconAdd, eventToHTMLElement } from '@anticrm/ui'
  import CreateProduct from './CreateProduct.svelte'
  import inventory from '../plugin'
  import { Table } from '@anticrm/view-resources'
  import { getClient } from '@anticrm/presentation'
  import view, { Viewlet } from '@anticrm/view'

  let search = ''
  $: resultQuery = search === '' ? {} : { $search: search }

  const client = getClient()
  const tableDescriptor = client.findOne<Viewlet>(view.class.Viewlet, {
    attachTo: inventory.class.Product,
    descriptor: view.viewlet.Table
  })

  function showCreateDialog (ev: MouseEvent) {
    showPopup(CreateProduct, { space: inventory.space.Products }, eventToHTMLElement(ev))
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <span class="ac-header__icon"><Icon icon={inventory.icon.Products} size={'small'} /></span>
    <span class="ac-header__title"><Label label={inventory.string.Products} /></span>
  </div>

  <EditWithIcon
    icon={IconSearch}
    placeholder={ui.string.Search}
    bind:value={search}
    on:change={() => {
      resultQuery = {}
    }}
  />
  <Button
    label={inventory.string.ProductCreateLabel}
    icon={IconAdd}
    kind={'primary'}
    on:click={(ev) => showCreateDialog(ev)}
  />
</div>

<Scroller>
  {#await tableDescriptor then descr}
    {#if descr}
      <Table
        _class={inventory.class.Product}
        config={descr.config}
        options={descr.options}
        query={resultQuery}
        showNotification
        highlightRows
      />
    {/if}
  {/await}
</Scroller>
