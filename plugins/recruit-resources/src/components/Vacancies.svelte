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
  import contact from '@anticrm/contact'
  import core, { Doc, DocumentQuery, Lookup, Ref, WithLookup } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Applicant, Vacancy } from '@anticrm/recruit'
  import { Button, getCurrentLocation, Icon, Label, navigate, Scroller, showPopup, IconAdd } from '@anticrm/ui'
  import SearchEdit from '@anticrm/ui/src/components/SearchEdit.svelte'
  import { Table } from '@anticrm/view-resources'
  import recruit from '../plugin'
  import CreateVacancy from './CreateVacancy.svelte'

  function action (vacancy: Ref<Vacancy>): void {
    const loc = getCurrentLocation()
    loc.path[2] = vacancy
    loc.path.length = 3
    navigate(loc)
  }

  let search: string = ''
  let vquery: string = ''
  let resultQuery: DocumentQuery<Doc> = {}
  let vacancyQuery: DocumentQuery<Doc> = {}

  let vacancies: WithLookup<Vacancy>[] = []
  const query = createQuery()
  let appQuery = false

  const lookup: Lookup<Vacancy> = {
    company: contact.class.Organization
  }

  $: query.query(recruit.class.Vacancy, { archived: false }, (res) => {
    vacancies = res
  }, { lookup })

  function lowerIncludes (a: string | undefined, b: string): boolean {
    return (a ?? '').toLowerCase().includes(b.toLowerCase())
  }

  $: if (vacancies.length > 0 && !appQuery) {
    vacancyQuery = {
      _id: {
        $in: vacancies
          .filter(
            (it) =>
              lowerIncludes(it.name, vquery) ||
              lowerIncludes(it.description, vquery) ||
              lowerIncludes(it.$lookup?.company?.name, vquery) ||
              (applications?.get(it._id) ?? 0) > 0
          )
          .map((it) => it._id)
      }
    }
  }

  $: resultQuery = vquery === '' ? {} : { $search: vquery }
  type ApplicationInfo = { count: number, modifiedOn: number }
  let applications: Map<Ref<Vacancy>, ApplicationInfo> | undefined

  const applicantQuery = createQuery()
  $: if (vacancies.length > 0) {
    appQuery = true
    applicantQuery.query(
      recruit.class.Applicant,
      { ...(resultQuery as DocumentQuery<Applicant>), space: { $in: vacancies.map((it) => it._id) } },
      (res) => {
        const result = new Map<Ref<Vacancy>, ApplicationInfo>()

        for (const d of res) {
          const v = result.get(d.space) ?? { count: 0, modifiedOn: 0 }
          v.count++
          v.modifiedOn = Math.max(v.modifiedOn, d.modifiedOn)
          result.set(d.space, v)
        }

        applications = result
        appQuery = false
      }
    )
  }

  function showCreateDialog () {
    showPopup(CreateVacancy, { space: recruit.space.CandidatesPublic }, 'top')
  }
  const applicationSorting = (a:Doc, b:Doc) => ((applications?.get(b._id as Ref<Vacancy>)?.count ?? 0) - (applications?.get(a._id as Ref<Vacancy>)?.count ?? 0)) ?? 0
  const modifiedSorting = (a:Doc, b:Doc) => ((applications?.get(b._id as Ref<Vacancy>)?.modifiedOn ?? 0) - (applications?.get(a._id as Ref<Vacancy>)?.modifiedOn ?? 0)) ?? 0
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={recruit.icon.Vacancy} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Vacancies} /></span>
  </div>
  <SearchEdit
    bind:value={search}
    on:change={() => {
      vquery = search
    }}
  />
  <Button icon={IconAdd} label={recruit.string.VacancyCreateLabel} kind={'primary'} on:click={showCreateDialog} />
</div>
<Scroller>
  <Table
    _class={recruit.class.Vacancy}
    config={[
      {
        key: '',
        presenter: recruit.component.VacancyItemPresenter,
        label: recruit.string.Vacancy,
        sortingKey: 'name',
        props: { action }
      },
      {
        key: '',
        presenter: recruit.component.VacancyCountPresenter,
        label: recruit.string.Applications,
        props: { applications, resultQuery },
        sortingKey: '@applications',
        sortingFunction: applicationSorting
      },
      '$lookup.company',
      'location',
      'description',
      {
        key: '',
        presenter: recruit.component.VacancyModifiedPresenter,
        label: core.string.Modified,
        props: { applications },
        sortingKey: 'modifiedOn',
        sortingFunction: modifiedSorting
      }
    ]}
    options={{
      lookup
    }}
    query={{
      ...vacancyQuery,
      archived: false
    }}
    showNotification
    highlightRows
  />
</Scroller>
