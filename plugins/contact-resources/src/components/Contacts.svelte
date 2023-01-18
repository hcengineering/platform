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
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Icon, IconAdd, Label, Loading, SearchEdit, showPopup } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import {
    ActionContext,
    FilterButton,
    getViewOptions,
    TableBrowser,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import contact from '../plugin'
  import CreateContact from './CreateContact.svelte'
  import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}

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

  $: twoRows = $deviceInfo.twoRows

  $: viewOptions = getViewOptions(viewlet)
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="antiPanel-component">
  <div class="ac-header withSettings" class:full={!twoRows} class:mini={twoRows}>
    <div class:ac-header-full={!twoRows} class:flex-between={twoRows}>
      <div class="ac-header__wrap-title mr-3">
        <div class="ac-header__icon"><Icon icon={contact.icon.Person} size={'small'} /></div>
        <span class="ac-header__title"><Label label={contact.string.Contacts} /></span>
        <div class="ml-4"><FilterButton _class={contact.class.Contact} /></div>
      </div>

      <SearchEdit
        bind:value={search}
        on:change={() => {
          updateResultQuery(search)
        }}
      />
    </div>
    <div class="ac-header-full" class:secondRow={twoRows}>
      <Button
        icon={IconAdd}
        label={contact.string.ContactCreateLabel}
        kind={'primary'}
        size={'small'}
        on:click={(ev) => showCreateDialog(ev)}
      />
      <ViewletSettingButton bind:viewOptions {viewlet} />
    </div>
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
        showNotification
      />
    {/if}
  {/if}
</div>
