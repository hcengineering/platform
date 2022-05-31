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
  import contact from '@anticrm/contact'
  import { Doc, DocumentQuery } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Tooltip, showPopup, Icon, Label, Loading, SearchEdit, Button, IconAdd } from '@anticrm/ui'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'
  import type { Filter } from '@anticrm/view'
  import { ActionContext, TableBrowser, ViewletSetting, FilterButton } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import CreateCandidate from './CreateCandidate.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}
  let filters: Filter[] = []

  const client = getClient()

  let descr: Viewlet | undefined
  let loading = true

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  client
    .findOne<Viewlet>(view.class.Viewlet, {
      attachTo: recruit.mixin.Candidate,
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

  async function updateResultQuery (search: string): Promise<void> {
    resultQuery = search === '' ? {} : { $search: search }
  }

  $: updateResultQuery(search)

  function showCreateDialog () {
    showPopup(CreateCandidate, {}, 'top')
  }
</script>

<div class="ac-header full withSettings">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={contact.icon.Person} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Candidates} /></span>
    <div class="ml-4"><FilterButton _class={recruit.mixin.Candidate} bind:filters /></div>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
  <Button icon={IconAdd} label={recruit.string.CandidateCreateLabel} kind={'primary'} on:click={showCreateDialog} />
  {#if descr}
    <Tooltip label={view.string.CustomizeView}>
      <Button
        icon={view.icon.Setting}
        kind={'transparent'}
        on:click={() => {
          showPopup(ViewletSetting, { viewlet: descr })
        }}
      />
    </Tooltip>
  {/if}
</div>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
{#if descr}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      _class={recruit.mixin.Candidate}
      config={preference?.config ?? descr.config}
      options={descr.options}
      query={resultQuery}
      bind:filters
      showNotification
    />
  {/if}
{/if}
