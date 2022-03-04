//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { Client, Doc } from '@anticrm/core'
import { IntlString, OK, Resources, Severity, Status, translate } from '@anticrm/platform'
import { ObjectSearchResult } from '@anticrm/presentation'
import { Applicant } from '@anticrm/recruit'
import task from '@anticrm/task'
import { showPanel, showPopup } from '@anticrm/ui'
import ApplicationItem from './components/ApplicationItem.svelte'
import ApplicationPresenter from './components/ApplicationPresenter.svelte'
import Applications from './components/Applications.svelte'
import ApplicationsPresenter from './components/ApplicationsPresenter.svelte'
import Candidates from './components/Candidates.svelte'
import CreateApplication from './components/CreateApplication.svelte'
import CreateCandidate from './components/CreateCandidate.svelte'
import CreateVacancy from './components/CreateVacancy.svelte'
import EditApplication from './components/EditApplication.svelte'
import EditVacancy from './components/EditVacancy.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import SkillsView from './components/SkillsView.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import Vacancies from './components/Vacancies.svelte'
import VacancyItemPresenter from './components/VacancyItemPresenter.svelte'
import VacancyPresenter from './components/VacancyPresenter.svelte'
import VacancyCountPresenter from './components/VacancyCountPresenter.svelte'
import recruit from './plugin'

async function createApplication (object: Doc): Promise<void> {
  showPopup(CreateApplication, { candidate: object._id, preserveCandidate: true })
}

async function editVacancy (object: Doc): Promise<void> {
  showPanel(recruit.component.EditVacancy, object._id, object._class, 'right')
}

export async function applicantValidator (applicant: Applicant, client: Client): Promise<Status> {
  if (applicant.attachedTo === undefined) {
    return new Status(Severity.INFO, recruit.status.CandidateRequired, {})
  }
  if (applicant.space === undefined) {
    return new Status(Severity.INFO, recruit.status.VacancyRequired, {})
  }
  const applicants = await client.findAll(recruit.class.Applicant, {
    space: applicant.space,
    attachedTo: applicant.attachedTo
  })
  if (applicants.filter((p) => p._id !== applicant._id).length > 0) {
    return new Status(Severity.ERROR, recruit.status.ApplicationExists, {})
  }
  return OK
}

export async function queryApplication (client: Client, search: string): Promise<ObjectSearchResult[]> {
  const _class = recruit.class.Applicant
  const cl = client.getHierarchy().getClass(_class)
  const shortLabel = (await translate(cl.shortLabel ?? '' as IntlString, {})).toUpperCase()

  // Check number pattern

  const sequence = (await client.findOne(task.class.Sequence, { attachedTo: _class }))?.sequence ?? 0

  const named = new Map((await client.findAll(_class, { $search: search }, { limit: 200 })).map(e => [e._id, e]))
  const nids: number[] = []
  if (sequence > 0) {
    for (let n = 0; n < sequence; n++) {
      const v = `${n}`
      if (v.includes(search)) {
        nids.push(n)
      }
    }
    const numbered = await client.findAll<Applicant>(_class, { number: { $in: nids } }, { limit: 200 })
    for (const d of numbered) {
      if (!named.has(d._id)) {
        named.set(d._id, d)
      }
    }
  }

  return Array.from(named.values()).map(e => ({
    doc: e,
    title: `${shortLabel}-${e.number}`,
    icon: task.icon.Task,
    component: ApplicationItem
  }))
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    CreateApplication: createApplication,
    EditVacancy: editVacancy
  },
  validator: {
    ApplicantValidator: applicantValidator
  },
  component: {
    CreateVacancy,
    CreateApplication,
    EditApplication,
    KanbanCard,
    ApplicationPresenter,
    ApplicationsPresenter,
    EditVacancy,
    TemplatesIcon,
    Applications,
    Candidates,
    CreateCandidate,
    VacancyPresenter,
    SkillsView,
    Vacancies,
    VacancyItemPresenter,
    VacancyCountPresenter
  },
  completion: {
    ApplicationQuery: async (client: Client, query: string) => await queryApplication(client, query)
  }
})
