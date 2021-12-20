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

import CreateVacancy from './components/CreateVacancy.svelte'
import CreateCandidates from './components/CreateCandidates.svelte'
import CreateCandidate from './components/CreateCandidate.svelte'
import CreateApplication from './components/CreateApplication.svelte'
import EditCandidate from './components/EditCandidate.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import EditVacancy from './components/EditVacancy.svelte'
import ApplicationPresenter from './components/ApplicationPresenter.svelte'
import ApplicationsPresenter from './components/ApplicationsPresenter.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import Applications from './components/Applications.svelte'
import EditApplication from './components/EditApplication.svelte'

import { showPopup } from '@anticrm/ui'
import { OK, Resources, Severity, Status } from '@anticrm/platform'
import { Applicant } from '@anticrm/recruit'
import recruit from './plugin'

async function createApplication (object: Doc): Promise<void> {
  showPopup(CreateApplication, { candidate: object._id, preserveCandidate: true })
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

export default async (): Promise<Resources> => ({
  actionImpl: {
    CreateApplication: createApplication
  },
  validator: {
    ApplicantValidator: applicantValidator
  },
  component: {
    CreateVacancy,
    CreateCandidates,
    CreateCandidate,
    CreateApplication,
    EditCandidate,
    EditApplication,
    KanbanCard,
    ApplicationPresenter,
    ApplicationsPresenter,
    EditVacancy,
    TemplatesIcon,
    Applications
  }
})
