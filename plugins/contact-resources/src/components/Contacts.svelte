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
  import { Button, Icon, IconAdd, Label, Loading, SearchEdit, showPopup } from '@anticrm/ui'
  import type { Filter } from '@anticrm/view'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'
  import { ActionContext, FilterButton, TableBrowser, ViewletSettingButton } from '@anticrm/view-resources'
  import contact from '../plugin'
  import CreateContact from './CreateContact.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}
  let filters: Filter[] = []

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? {} : { $search: search }
  }

  let viewlet: Viewlet | undefined
  let loading = true

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  const client = getClient()
  client
    .findOne<Viewlet>(view.class.Viewlet, {
      attachTo: contact.class.Contact,
      descriptor: view.viewlet.Table
    })
    .then((res) => {
      viewlet = res
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

  function showCreateDialog (ev: Event) {
    showPopup(CreateContact, { space: contact.space.Contacts, targetElement: ev.target }, ev.target as HTMLElement)
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="antiPanel-component">
  <div class="ac-header full withSettings">
    <div class="ac-header__wrap-title">
      <div class="ac-header__icon"><Icon icon={contact.icon.Person} size={'small'} /></div>
      <span class="ac-header__title"><Label label={contact.string.Contacts} /></span>
      <div class="ml-4"><FilterButton _class={contact.class.Contact} bind:filters /></div>
    </div>

    <SearchEdit
      bind:value={search}
      on:change={() => {
        updateResultQuery(search)
      }}
    />
    <Button
      icon={IconAdd}
      label={contact.string.ContactCreateLabel}
      kind={'primary'}
      on:click={(ev) => showCreateDialog(ev)}
    />
    <ViewletSettingButton {viewlet} />
  </div>

  {#if viewlet}
    {#if loading}
      <Loading />
    {:else}
      <TableBrowser
        _class={contact.class.Contact}
        config={preference?.config ?? viewlet.config}
        options={viewlet.options}
        query={resultQuery}
        bind:filters
        showNotification
      />
    {/if}
  {/if}
</div>
