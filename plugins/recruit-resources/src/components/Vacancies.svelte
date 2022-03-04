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
  import { Doc, DocumentQuery, Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Applicant, Vacancy } from '@anticrm/recruit'
  import { Button, getCurrentLocation, Icon, Label, navigate, Scroller, showPopup } from '@anticrm/ui'
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
  let resultQuery: DocumentQuery<Doc> = {}
  let vacancyQuery: DocumentQuery<Doc> = {}

  async function updateResultQuery (search: string): Promise<void> {
    resultQuery = search === '' ? {} : { $search: search }
  }

  let vacancies: Vacancy[] = []
  const query = createQuery()

  $: query.query(recruit.class.Vacancy, { archived: false }, (res) => {
    vacancies = res
  })

  $: if (vacancies.length > 0) {
    vacancyQuery = {
      _id: {
        $in: vacancies
          .filter((it) => it.name.includes(search) || it.description.includes(search) || it.company?.includes(search) || ((applications?.get(it._id) ?? 0) > 0))
          .map((it) => it._id)
      }
    }
  }

  let applications: Map<Ref<Vacancy>, number> | undefined

  const applicantQuery = createQuery()
  $: if (vacancies.length > 0) {
    applicantQuery.query(
      recruit.class.Applicant,
      { ...(resultQuery as DocumentQuery<Applicant>), space: { $in: vacancies.map((it) => it._id) } },
      (res) => {
        const result = new Map<Ref<Vacancy>, number>()

        for (const d of res) {
          result.set(d.space, (result.get(d.space) ?? 0) + 1)
        }

        applications = result
      }
    )
  }

  function showCreateDialog (ev: Event) {
    showPopup(CreateVacancy, { space: recruit.space.CandidatesPublic }, ev.target as HTMLElement)
  }
</script>

<div class="ac-header full">
  <div class="ac-header__wrap-title">
    <div class="ac-header__icon"><Icon icon={recruit.icon.Vacancy} size={'small'} /></div>
    <span class="ac-header__title"><Label label={recruit.string.Vacancies} /></span>
  </div>
  <SearchEdit
    bind:value={search}
    on:change={() => {
      updateResultQuery(search)
    }}
  />
  <Button label={recruit.string.Create} primary={true} size={'small'} on:click={(ev) => showCreateDialog(ev)} />
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
        props: { applications, resultQuery }
      },
      'company',
      'location',
      'description',
      'modifiedOn'
    ]}
    options={{}}
    query={{
      ...vacancyQuery,
      archived: false
    }}
    showNotification
  />
</Scroller>
