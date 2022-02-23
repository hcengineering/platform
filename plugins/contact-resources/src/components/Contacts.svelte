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
  import { Button, Icon, IconAdd, Label, Scroller, SearchEdit, showPopup } from '@anticrm/ui'
  import view, { Viewlet } from '@anticrm/view'
  import { Table } from '@anticrm/view-resources'
  import contact from '../plugin'
  import CreateContact from './CreateContact.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}

  function updateResultQuery (search: string): void {
    resultQuery = (search === '') ? { } : { $search: search }
  }

  const client = getClient()
  const tableDescriptor = client.findOne<Viewlet>(view.class.Viewlet, { attachTo: contact.class.Contact, descriptor: view.viewlet.Table })


  function showCreateDialog (ev: Event) {
    showPopup(CreateContact, { space: contact.space.Contacts, targetElement: ev.target }, ev.target as HTMLElement)
  }
</script>

<div class="antiPanel-component filled">
  <div class="ac-header full">
    <div class="ac-header__wrap-title">
      <div class="ac-header__icon"><Icon icon={contact.icon.Person} size={'small'}/></div>
      <span class="ac-header__title"><Label label={contact.string.Contacts}/></span>
    </div>
    
    <SearchEdit bind:value={search} on:change={() => {
      updateResultQuery(search)
    }}/>
    <Button icon={IconAdd} label={contact.string.Create} primary={true} size={'small'} on:click={(ev) => showCreateDialog(ev)}/>
  </div>

  <Scroller>
    {#await tableDescriptor then descr}
      {#if descr}
        <Table 
          _class={contact.class.Contact}
          config={descr.config}
          options={descr.options}
          query={ resultQuery }
          enableChecking
        />
      {/if}
    {/await}
  </Scroller>
</div>
