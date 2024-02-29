<!--
//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import { Document } from '@hcengineering/document'
  import { ActionContext } from '@hcengineering/presentation'
  import { Label, Loading, SearchEdit } from '@hcengineering/ui'
  import view, { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { FilterButton, TableBrowser, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import document from '../plugin'

  export let query: DocumentQuery<Document> = {}

  let search = ''
  let resultQuery: DocumentQuery<Doc> = query

  function updateResultQuery (search: string, query: DocumentQuery<Document>): void {
    resultQuery = search === '' ? { ...query } : { ...query, $search: search }
  }

  let viewlet: Viewlet | undefined
  let loading = true

  let preference: ViewletPreference | undefined
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="antiPanel-component">
  <div class="ac-header full divide caption-height">
    <div class="ac-header__wrap-title mr-3">
      <span class="ac-header__title"><Label label={document.string.Documents} /></span>
    </div>
  </div>
  <div class="ac-header full divide search-start">
    <div class="ac-header-full small-gap">
      <SearchEdit
        bind:value={search}
        on:change={() => {
          updateResultQuery(search, query)
        }}
      />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
      <div class="buttons-divider" />
      <FilterButton _class={document.class.Document} />
    </div>
    <div class="ac-header-full medium-gap">
      <ViewletSelector
        hidden
        bind:viewlet
        bind:preference
        bind:loading
        viewletQuery={{
          attachTo: document.class.Document,
          descriptor: view.viewlet.Table
        }}
      />
      <ViewletSettingButton bind:viewlet />
      <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    </div>
  </div>

  {#if loading}
    <Loading />
  {:else if viewlet}
    <TableBrowser
      _class={document.class.Document}
      config={preference?.config ?? viewlet.config}
      options={viewlet.options}
      query={resultQuery}
      totalQuery={query}
      showNotification
    />
  {/if}
</div>
