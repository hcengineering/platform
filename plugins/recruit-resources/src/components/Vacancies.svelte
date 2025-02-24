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
  import core, {
    AccountRole,
    Doc,
    DocumentQuery,
    Ref,
    WithLookup,
    getCurrentAccount,
    hasAccountRole
  } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Vacancy } from '@hcengineering/recruit'
  import {
    Button,
    Component,
    IconAdd,
    Loading,
    SearchInput,
    showPopup,
    tableToCSV,
    Header,
    Breadcrumb
  } from '@hcengineering/ui'
  import view, { BuildModelKey, ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateVacancy from './CreateVacancy.svelte'
  import IconVacancy from './icons/Vacancy.svelte'

  let search: string = ''
  let searchQuery: DocumentQuery<Doc> = {}
  let resultQuery: DocumentQuery<Doc> = {}

  $: searchQuery = search === '' ? {} : { $search: search }

  interface ApplicationInfo {
    count: number
    modifiedOn: number
  }
  let applications: Map<Ref<Vacancy>, ApplicationInfo> = new Map<Ref<Vacancy>, ApplicationInfo>()

  const applicantQuery = createQuery()
  $: applicantQuery.query(
    recruit.class.Applicant,
    {},
    (res) => {
      applications.clear()
      for (const d of res) {
        const v = applications.get(d.space) ?? { count: 0, modifiedOn: 0 }
        v.count++
        v.modifiedOn = Math.max(v.modifiedOn, d.modifiedOn)
        applications.set(d.space, v)
      }

      applications = applications
    },
    {
      showArchived: true,
      projection: {
        _id: 1,
        modifiedOn: 1,
        space: 1
      }
    }
  )

  function showCreateDialog () {
    showPopup(CreateVacancy, {}, 'top')
  }
  const applicationSorting = (a: Doc, b: Doc) =>
    (applications?.get(b._id as Ref<Vacancy>)?.count ?? 0) - (applications?.get(a._id as Ref<Vacancy>)?.count ?? 0) ?? 0
  const modifiedSorting = (a: Doc, b: Doc) =>
    (applications?.get(b._id as Ref<Vacancy>)?.modifiedOn ?? b.modifiedOn) -
    (applications?.get(a._id as Ref<Vacancy>)?.modifiedOn ?? a.modifiedOn)

  $: replacedKeys = new Map<string, BuildModelKey>([
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
        label: core.string.ModifiedDate,
        props: { applications },
        sortingKey: 'modifiedOn',
        sortingFunction: modifiedSorting
      }
    ]
  ])

  let viewlet: WithLookup<Viewlet> | undefined
  let loading = true

  let preference: ViewletPreference | undefined
  let viewOptions: ViewOptions | undefined

  function createConfig (
    descr: Viewlet,
    preference: ViewletPreference | undefined,
    applications: Map<Ref<Vacancy>, ApplicationInfo>,
    replacedKeys: Map<string, BuildModelKey>
  ): (string | BuildModelKey)[] {
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

<Header
  adaptive={'freezeActions'}
  hideActions={!(viewlet?.descriptor === view.viewlet.Table || hasAccountRole(getCurrentAccount(), AccountRole.User))}
>
  <svelte:fragment slot="beforeTitle">
    <ViewletSelector
      bind:loading
      bind:viewlet
      bind:preference
      ignoreFragment
      viewletQuery={{
        attachTo: recruit.class.Vacancy,
        descriptor: { $in: [view.viewlet.Table, view.viewlet.List] }
      }}
    />
    <ViewletSettingButton bind:viewOptions bind:viewlet />
  </svelte:fragment>

  <Breadcrumb icon={IconVacancy} label={recruit.string.Vacancies} size={'large'} isCurrent />

  <svelte:fragment slot="search">
    <SearchInput bind:value={search} collapsed on:change={(e) => (search = e.detail)} />
    <FilterButton _class={recruit.class.Vacancy} {viewOptions} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    {#if viewlet?.descriptor === view.viewlet.Table}
      <Button
        label={recruit.string.Export}
        on:click={() => {
          // Download it
          const filename = 'vacancies' + new Date().toLocaleDateString() + '.csv'
          const link = document.createElement('a')
          link.style.display = 'none'
          link.setAttribute('target', '_blank')
          link.setAttribute(
            'href',
            'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(tableToCSV('vacanciesData'))
          )
          link.setAttribute('download', filename)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }}
      />
    {/if}
    {#if hasAccountRole(getCurrentAccount(), AccountRole.User)}
      <Button icon={IconAdd} label={recruit.string.VacancyCreateLabel} kind={'primary'} on:click={showCreateDialog} />
    {/if}
  </svelte:fragment>
</Header>
<FilterBar
  _class={recruit.class.Vacancy}
  space={undefined}
  {viewOptions}
  query={searchQuery}
  on:change={(e) => (resultQuery = e.detail)}
/>

{#if loading}
  <Loading />
{:else if viewlet && viewlet?.$lookup?.descriptor?.component}
  <Component
    is={viewlet.$lookup.descriptor.component}
    props={{
      _class: recruit.class.Vacancy,
      options: viewlet.options,
      config: createConfig(viewlet, preference, applications, replacedKeys),
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      query: resultQuery,
      totalQuery: {},
      tableId: 'vacanciesData'
    }}
  />
{/if}
