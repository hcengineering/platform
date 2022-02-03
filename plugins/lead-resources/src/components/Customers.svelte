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
  import { getClient } from '@anticrm/presentation'
  import { Icon, Label, ScrollBox, SearchEdit } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import view, { Viewlet } from '@anticrm/view'
  import lead from '../plugin'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}

  const client = getClient()
  const tableDescriptor = client.findOne<Viewlet>(view.class.Viewlet, { attachTo: lead.mixin.Customer, descriptor: view.viewlet.Table })

  function updateResultQuery (search: string): void {
    resultQuery = (search === '') ? { } : { $search: search }
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={lead.icon.Lead} size={'small'} /></div>
    <span class="ac-header__title"><Label label={lead.string.Customers} /></span>
  </div>

  <SearchEdit bind:value={search} on:change={() => {
    updateResultQuery(search)
  }}/>
</div>

<ScrollBox vertical stretch noShift>
  {#await tableDescriptor then descr}
    {#if descr}
      <Table
        _class={lead.mixin.Customer}
        config={descr.config}
        options={descr.options}
        query={ resultQuery }
        enableChecking
      />
    {/if}
  {/await}
</ScrollBox>
<div class="ac-body__space-3" />
