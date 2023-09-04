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
  import { ActionContext } from '@hcengineering/presentation'
  import { Button, Label, Loading, SearchEdit, showPopup } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference, ViewOptions } from '@hcengineering/view'
  import {
    FilterBar,
    FilterButton,
    TableBrowser,
    ViewletSelector,
    ViewletSettingButton
  } from '@hcengineering/view-resources'
  import contact from '../plugin'
  import CreateContact from './CreateContact.svelte'
  // import { deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  let search = ''
  let searchQuery: DocumentQuery<Doc> = {}
  let resultQuery: DocumentQuery<Doc> = searchQuery

  function updateResultQuery (search: string): void {
    searchQuery = search === '' ? {} : { $search: search }
  }

  let viewlet: Viewlet | undefined
  let viewOptions: ViewOptions | undefined
  let preference: ViewletPreference | undefined = undefined
  let loading = true

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
  <div class="ac-header full divide">
    <div class="ac-header__wrap-title mr-3">
      <span class="ac-header__title"><Label label={contact.string.Contacts} /></span>
    </div>
    <div class="mb-1 clear-mins">
      <Button
        label={contact.string.ContactCreateLabel}
        kind={'accented'}
        size={'medium'}
        on:click={(ev) => showCreateDialog(ev)}
      />
    </div>
  </div>
  <div class="ac-header full divide search-start">
    <div class="ac-header-full small-gap">
      <SearchEdit bind:value={search} on:change={() => updateResultQuery(search)} />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
      <div class="buttons-divider" />
      <FilterButton _class={contact.class.Contact} />
    </div>
    <div class="ac-header-full medium-gap">
      <ViewletSelector
        hidden
        bind:viewlet
        bind:preference
        bind:loading
        viewletQuery={{
          attachTo: contact.class.Contact,
          descriptor: view.viewlet.Table
        }}
      />
      <ViewletSettingButton bind:viewOptions bind:viewlet />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    </div>
  </div>

  <FilterBar
    _class={contact.class.Contact}
    space={undefined}
    {viewOptions}
    query={searchQuery}
    on:change={(e) => (resultQuery = e.detail)}
  />
  {#if loading}
    <Loading />
  {:else if viewlet && viewOptions}}
    <TableBrowser
      _class={contact.class.Contact}
      config={preference?.config ?? viewlet.config}
      options={viewlet.options}
      query={resultQuery}
      showNotification
    />
  {/if}
</div>
