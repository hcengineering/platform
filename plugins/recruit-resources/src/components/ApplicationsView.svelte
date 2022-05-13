<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Applicant } from '@anticrm/recruit'
  import task from '@anticrm/task'
  import { ActionIcon, Button, Icon, IconAdd, Label, Loading, SearchEdit, showPopup } from '@anticrm/ui'
  import view, { Viewlet, ViewletPreference } from '@anticrm/view'
  import { TableBrowser, ViewletSetting } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import CreateApplication from './CreateApplication.svelte'

  let search = ''
  let resultQuery: DocumentQuery<Doc> = {}
  const baseQuery: DocumentQuery<Applicant> = {
    doneState: null
  }
  const client = getClient()

  let descr: Viewlet | undefined
  let loading = true

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  client
    .findOne<Viewlet>(view.class.Viewlet, {
      attachTo: recruit.class.Applicant,
      descriptor: task.viewlet.StatusTable
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

  function showCreateDialog () {
    showPopup(CreateApplication, {}, 'top')
  }

  function updateResultQuery (search: string): void {
    resultQuery = search === '' ? baseQuery : { ...baseQuery, $search: search }
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={recruit.icon.Application} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Applications} /></span>
  </div>

  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
  <Button icon={IconAdd} label={recruit.string.ApplicationCreateLabel} kind={'primary'} on:click={showCreateDialog} />
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
      _class={recruit.class.Applicant}
      config={preference?.config ?? descr.config}
      options={descr.options}
      query={resultQuery}
      showNotification
    />
  {/if}
{/if}
