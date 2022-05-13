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
  import { Doc, DocumentQuery } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { ActionIcon, Icon, Label, Loading, showPopup, SearchEdit } from '@anticrm/ui'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'
  import { ViewletSetting, TableBrowser } from '@anticrm/view-resources'
  import lead from '../plugin'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}

  let descr: Viewlet | undefined
  let loading = true

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  const client = getClient()
  client
    .findOne<Viewlet>(view.class.Viewlet, {
      attachTo: lead.mixin.Customer,
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

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? {} : { $search: search }
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={lead.icon.Lead} size={'small'} /></div>
    <span class="ac-header__title"><Label label={lead.string.Customers} /></span>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
  {#if descr}
    <ActionIcon
      icon={view.icon.Setting}
      size={'small'}
      label={view.string.CustomizeView}
      action={() => {
        showPopup(ViewletSetting, { viewlet: descr })
      }}
    />
  {/if}
</div>

{#if descr}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      _class={lead.mixin.Customer}
      config={preference?.config ?? descr.config}
      options={descr.options}
      query={resultQuery}
      showNotification
    />
  {/if}
{/if}
