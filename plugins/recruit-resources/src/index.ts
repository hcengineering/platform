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

import type { Doc } from '@anticrm/core'

import CreateVacancy from './components/CreateVacancy.svelte'
import CreateCandidates from './components/CreateCandidates.svelte'
import CreateCandidate from './components/CreateCandidate.svelte'
import CreateApplication from './components/CreateApplication.svelte'
import EditCandidate from './components/EditCandidate.svelte'
import Attachments from './components/Attachments.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import ApplicationPresenter from './components/ApplicationPresenter.svelte'
import ApplicationsPresenter from './components/ApplicationsPresenter.svelte'
import TxApplicantUpdate from './components/activity/TxApplicantUpdate.svelte'

import { showPopup } from '@anticrm/ui'
import { Resources } from '@anticrm/platform'

async function createApplication (object: Doc): Promise<void> {
  showPopup(CreateApplication, { candidate: object._id, preserveCandidate: true })
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    CreateApplication: createApplication
  },
  component: {
    CreateVacancy,
    CreateCandidates,
    CreateCandidate,
    CreateApplication,
    EditCandidate,
    Attachments,
    KanbanCard,
    ApplicationPresenter,
    ApplicationsPresenter
  },
  activity: {
    TxApplicantUpdate
  }
})
