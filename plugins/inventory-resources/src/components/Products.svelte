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
  import ui, {
    Button,
    EditWithIcon,
    Icon,
    IconSearch,
    Label,
    showPopup,
    IconAdd,
    eventToHTMLElement,
    Loading,
    ActionIcon
  } from '@anticrm/ui'
  import CreateProduct from './CreateProduct.svelte'
  import inventory from '../plugin'
  import { TableBrowser, ViewletSetting } from '@anticrm/view-resources'
  import { createQuery, getClient } from '@anticrm/presentation'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'

  let search = ''
  $: resultQuery = search === '' ? {} : { $search: search }

  let descr: Viewlet | undefined
  let loading = true

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  const client = getClient()
  client
    .findOne<Viewlet>(view.class.Viewlet, {
      attachTo: inventory.class.Product,
      descriptor: view.viewlet.Table
    })
    .then((res) => {
      descr = res
      if (res !== undefined) {
        preferenceQuery.query(
          view.class.ViewletPreference,
          {
            attachedTo: res._id
          },
          (res) => {
            preference = res[0]
            loading = false
          },
          { limit: 1 }
        )
      }
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

  {#if descr}
    <ActionIcon
      icon={view.icon.Setting}
      direction={'top'}
      size={'small'}
      label={view.string.CustomizeView}
      action={() => {
        showPopup(ViewletSetting, { viewlet: descr })
      }}
    />
  {/if}
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

{#if descr}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      _class={inventory.class.Product}
      config={preference?.config ?? descr.config}
      options={descr.options}
      query={resultQuery}
      showNotification
    />
  {/if}
{/if}
