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
  import { Organization } from '@hcengineering/contact'
  import core, { Doc, DocumentQuery, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Applicant, Vacancy } from '@hcengineering/recruit'
  import { Button, Component, IconAdd, Label, Loading, SearchEdit, showPopup } from '@hcengineering/ui'
  import view, { BuildModelKey, ViewOptions, Viewlet, ViewletPreference } from '@hcengineering/view'
  import { FilterBar, FilterButton, ViewletSelector, ViewletSettingButton } from '@hcengineering/view-resources'
  import recruit from '../plugin'
  import CreateOrganization from './CreateOrganization.svelte'
  import VacancyListApplicationsPopup from './organizations/VacancyListApplicationsPopup.svelte'
  import VacancyListCountPresenter from './organizations/VacancyListCountPresenter.svelte'
  import VacancyPopup from './organizations/VacancyPopup.svelte'

  let search: string = ''
  let searchQuery: DocumentQuery<Doc> = {}
  let resultQuery: DocumentQuery<Doc> = {}

  $: searchQuery = search === '' ? {} : { $search: search }

  type CountInfo = {
    count: number
    modifiedOn: number
    vacancies: Ref<Vacancy>[]
  }
  let applications: Map<Ref<Organization>, CountInfo> = new Map<Ref<Organization>, CountInfo>()

  let vacancies: Map<Ref<Organization>, CountInfo> = new Map<Ref<Organization>, CountInfo>()
  let vmap: Map<Ref<Vacancy>, Vacancy> | undefined

  const vacancyQuery = createQuery()

  let applicationsList: Applicant[] = []
  let vacanciesList: Vacancy[] = []

  $: vacancyQuery.query(recruit.class.Vacancy, { company: { $exists: true }, archived: false }, (res) => {
    vacanciesList = res
    vmap = new Map(res.map((it) => [it._id, it]))
  })

  $: vacancies = vacanciesList.reduce<Map<Ref<Organization>, CountInfo>>((map, it) => {
    const ifo = map.get(it.company as Ref<Organization>) ?? {
      count: 0,
      modifiedOn: 0,
      vacancies: []
    }
    map.set(it.company as Ref<Organization>, {
      count: ifo.count + 1,
      modifiedOn: Math.max(ifo.modifiedOn, it.modifiedOn),
      vacancies: [...ifo.vacancies, it._id]
    })
    return map
  }, new Map())

  const applicantQuery = createQuery()
  $: applicantQuery.query(
    recruit.class.Applicant,
    {
      doneState: null
    },
    (res) => {
      applicationsList = res
    },
    {
      projection: {
        _id: 1,
        modifiedOn: 1,
        space: 1
      }
    }
  )

  $: {
    const _applications = new Map<Ref<Organization>, CountInfo>()
    for (const d of applicationsList) {
      const vacancy = vmap?.get(d.space)
      if (vacancy?.company !== undefined) {
        const v = _applications.get(vacancy.company) ?? {
          count: 0,
          modifiedOn: 0,
          vacancies: []
        }
        if (!v.vacancies.includes(vacancy._id)) {
          v.vacancies.push(vacancy._id)
        }
        v.count++
        v.modifiedOn = Math.max(v.modifiedOn, d.modifiedOn)
        _applications.set(vacancy.company, v)
      }
    }
    applications = _applications
  }

  function showCreateDialog () {
    showPopup(CreateOrganization, { space: recruit.space.CandidatesPublic }, 'top')
  }
  const applicationSorting = (a: Doc, b: Doc) =>
    (applications?.get(b._id as Ref<Organization>)?.count ?? 0) -
      (applications?.get(a._id as Ref<Organization>)?.count ?? 0) ?? 0

  const vacancySorting = (a: Doc, b: Doc) =>
    (vacancies?.get(b._id as Ref<Organization>)?.count ?? 0) -
      (vacancies?.get(a._id as Ref<Organization>)?.count ?? 0) ?? 0

  const modifiedSorting = (a: Doc, b: Doc) =>
    (applications?.get(b._id as Ref<Organization>)?.modifiedOn ?? b.modifiedOn) -
    (applications?.get(a._id as Ref<Organization>)?.modifiedOn ?? a.modifiedOn)

  $: replacedKeys = new Map<string, BuildModelKey>([
    [
      '@vacancies',
      {
        key: '',
        presenter: VacancyListCountPresenter,
        label: recruit.string.Vacancies,
        props: {
          values: vacancies,
          label: recruit.string.Vacancies,
          icon: recruit.icon.Vacancy,
          component: VacancyPopup
        },
        sortingKey: '@vacancies',
        sortingFunction: vacancySorting
      }
    ],
    [
      '@applications',
      {
        key: '',
        presenter: VacancyListCountPresenter,
        label: recruit.string.Applications,
        props: {
          values: applications,
          label: recruit.string.Applications,
          component: VacancyListApplicationsPopup,
          icon: recruit.icon.Application,
          resultQuery: {
            doneState: null
          }
        },
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
    descr: Viewlet | undefined,
    preference: ViewletPreference | undefined,
    replacedKeys: Map<string, BuildModelKey>
  ): (string | BuildModelKey)[] {
    const base = preference?.config ?? descr?.config ?? []
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

  $: finalConfig = createConfig(viewlet, preference, replacedKeys)
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label label={recruit.string.Organizations} /></span>
  </div>
  <div class="ac-header-full medium-gap mb-1">
    <ViewletSelector
      bind:loading
      bind:viewlet
      bind:preference
      viewletQuery={{
        attachTo: recruit.mixin.VacancyList,
        descriptor: { $in: [view.viewlet.Table, view.viewlet.List] }
      }}
    />
    <Button icon={IconAdd} label={recruit.string.CompanyCreateLabel} kind={'accented'} on:click={showCreateDialog} />
  </div>
</div>
<div class="ac-header full divide search-start">
  <div class="ac-header-full small-gap">
    <SearchEdit bind:value={search} on:change={(e) => (search = e.detail)} />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
    <div class="buttons-divider" />
    <FilterButton _class={recruit.mixin.VacancyList} />
  </div>
  <div class="ac-header-full medium-gap">
    <ViewletSettingButton bind:viewOptions bind:viewlet />
    <!-- <ActionIcon icon={IconMoreH} size={'small'} /> -->
  </div>
</div>

<FilterBar
  _class={recruit.mixin.VacancyList}
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
      _class: recruit.mixin.VacancyList,
      options: viewlet.options,
      config: finalConfig,
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      query: {
        ...resultQuery
      },
      totalQuery: {}
    }}
  />
{/if}
