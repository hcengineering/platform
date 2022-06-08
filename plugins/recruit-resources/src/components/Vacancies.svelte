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
  import core, { Doc, DocumentQuery, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Vacancy } from '@anticrm/recruit'
  import { Button, Icon, IconAdd, Label, Loading, SearchEdit, showPopup } from '@anticrm/ui'
  import view, { BuildModelKey, Filter, Viewlet, ViewletPreference } from '@anticrm/view'
  import { FilterButton, TableBrowser, ViewletSettingButton } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import CreateVacancy from './CreateVacancy.svelte'

  let search: string = ''
  let resultQuery: DocumentQuery<Doc> = {}

  $: resultQuery = search === '' ? {} : { $search: search }

  type ApplicationInfo = { count: number; modifiedOn: number }
  let applications: Map<Ref<Vacancy>, ApplicationInfo> = new Map<Ref<Vacancy>, ApplicationInfo>()

  const applicantQuery = createQuery()
  $: applicantQuery.query(
    recruit.class.Applicant,
    {},
    (res) => {
      for (const d of res) {
        const v = applications.get(d.space) ?? { count: 0, modifiedOn: 0 }
        v.count++
        v.modifiedOn = Math.max(v.modifiedOn, d.modifiedOn)
        applications.set(d.space, v)
      }

      applications = applications
    },
    {
      projection: {
        _id: 1,
        modifiedOn: 1,
        space: 1
      }
    }
  )

  function showCreateDialog () {
    showPopup(CreateVacancy, { space: recruit.space.CandidatesPublic }, 'top')
  }
  const applicationSorting = (a: Doc, b: Doc) =>
    (applications?.get(b._id as Ref<Vacancy>)?.count ?? 0) - (applications?.get(a._id as Ref<Vacancy>)?.count ?? 0) ?? 0
  const modifiedSorting = (a: Doc, b: Doc) =>
    (applications?.get(b._id as Ref<Vacancy>)?.modifiedOn ?? 0) -
      (applications?.get(a._id as Ref<Vacancy>)?.modifiedOn ?? 0) ?? 0

  const replacedKeys: Map<string, BuildModelKey> = new Map<string, BuildModelKey>([
    [
      '@applications',
      {
        key: '',
        presenter: recruit.component.VacancyCountPresenter,
        label: recruit.string.Applications,
        props: { applications },
        sortingKey: '@applications',
        sortingFunction: applicationSorting
      }
    ],
    [
      '@applications.modifiedOn',
      {
        key: '',
        presenter: recruit.component.VacancyModifiedPresenter,
        label: core.string.Modified,
        props: { applications },
        sortingKey: 'modifiedOn',
        sortingFunction: modifiedSorting
      }
    ]
  ])

  const client = getClient()
  let filters: Filter[] = []

  let descr: Viewlet | undefined
  let loading = true

  const preferenceQuery = createQuery()
  let preference: ViewletPreference | undefined

  client
    .findOne<Viewlet>(view.class.Viewlet, {
      attachTo: recruit.class.Vacancy,
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

  function createConfig (descr: Viewlet, preference: ViewletPreference | undefined): (string | BuildModelKey)[] {
    const base = preference?.config ?? descr.config
    const result: (string | BuildModelKey)[] = []
    for (const key of base) {
      if (typeof key === 'string') {
        result.push(replacedKeys.get(key) ?? key)
      } else {
        result.push(replacedKeys.get(key.key) ?? key)
      }
    }
    return result
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={recruit.icon.Vacancy} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Vacancies} /></span>
    <div class="ml-4"><FilterButton _class={recruit.class.Vacancy} bind:filters /></div>
  </div>
  <SearchEdit
    bind:value={search}
    on:change={(e) => {
      search = e.detail
    }}
  />
  <Button icon={IconAdd} label={recruit.string.VacancyCreateLabel} kind={'primary'} on:click={showCreateDialog} />
  <ViewletSettingButton viewlet={descr} />
</div>
{#if descr}
  {#if loading}
    <Loading />
  {:else}
    <TableBrowser
      _class={recruit.class.Vacancy}
      config={createConfig(descr, preference)}
      options={descr.options}
      query={{
        ...resultQuery,
        archived: false
      }}
      bind:filters
      showNotification
    />
  {/if}
{/if}
