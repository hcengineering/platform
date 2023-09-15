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

import {
  Client,
  Doc,
  DocumentQuery,
  FindResult,
  ObjQueryType,
  Ref,
  RelatedDocument,
  toIdMap
} from '@hcengineering/core'
import { OK, Resources, Severity, Status } from '@hcengineering/platform'
import { ObjectSearchResult, createQuery } from '@hcengineering/presentation'
import { Applicant, Candidate, Vacancy } from '@hcengineering/recruit'
import task from '@hcengineering/task'
import { showPopup } from '@hcengineering/ui'
import { Filter } from '@hcengineering/view'
import { FilterQuery } from '@hcengineering/view-resources'
import ApplicantFilter from './components/ApplicantFilter.svelte'
import ApplicationItem from './components/ApplicationItem.svelte'
import ApplicationPresenter from './components/ApplicationPresenter.svelte'
import Applications from './components/Applications.svelte'
import ApplicationsPresenter from './components/ApplicationsPresenter.svelte'
import CreateApplication from './components/CreateApplication.svelte'
import CreateCandidate from './components/CreateCandidate.svelte'
import CreateVacancy from './components/CreateVacancy.svelte'
import EditApplication from './components/EditApplication.svelte'
import EditVacancy from './components/EditVacancy.svelte'
import KanbanCard from './components/KanbanCard.svelte'
import MatchVacancy from './components/MatchVacancy.svelte'
import NewCandidateHeader from './components/NewCandidateHeader.svelte'
import NotificationApplicantPresenter from './components/NotificationApplicantPresenter.svelte'
import Organizations from './components/Organizations.svelte'
import SkillsView from './components/SkillsView.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import Vacancies from './components/Vacancies.svelte'
import VacancyCountPresenter from './components/VacancyCountPresenter.svelte'
import VacancyItem from './components/VacancyItem.svelte'
import VacancyItemPresenter from './components/VacancyItemPresenter.svelte'
import VacancyList from './components/VacancyList.svelte'
import VacancyModifiedPresenter from './components/VacancyModifiedPresenter.svelte'
import VacancyPresenter from './components/VacancyPresenter.svelte'
import VacancyTemplateEditor from './components/VacancyTemplateEditor.svelte'
import CreateOpinion from './components/review/CreateOpinion.svelte'
import CreateReview from './components/review/CreateReview.svelte'
import EditReview from './components/review/EditReview.svelte'
import OpinionPresenter from './components/review/OpinionPresenter.svelte'
import Opinions from './components/review/Opinions.svelte'
import OpinionsPresenter from './components/review/OpinionsPresenter.svelte'
import ReviewPresenter from './components/review/ReviewPresenter.svelte'
import Reviews from './components/review/Reviews.svelte'
import recruit from './plugin'
import {
  getAppTitle,
  getObjectLink,
  getRevTitle,
  getSequenceId,
  getSequenceLink,
  getTalentId,
  getVacTitle,
  objectLinkProvider,
  resolveLocation
} from './utils'

import { MoveApplicant } from './actionImpl'

async function createOpinion (object: Doc): Promise<void> {
  showPopup(CreateOpinion, { space: object.space, review: object._id })
}

export async function applicantValidator (applicant: Applicant, client: Client): Promise<Status> {
  if (applicant.attachedTo === undefined) {
    return new Status(Severity.INFO, recruit.status.TalentRequired, {})
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

export async function queryApplication (
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const _class = recruit.class.Applicant
  const cl = client.getHierarchy().getClass(_class)
  const shortLabel = cl.shortLabel?.toUpperCase() ?? ''

  // Check number pattern

  const sequence = (await client.findOne(task.class.Sequence, { attachedTo: _class }))?.sequence ?? 0

  const q: DocumentQuery<Applicant> = { $search: search }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Applicant>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Applicant>)
    }
  }
  const named = new Map(
    (await client.findAll(_class, q, { limit: 200, lookup: { attachedTo: recruit.mixin.Candidate } })).map((e) => [
      e._id,
      e
    ])
  )
  const nids: number[] = []
  if (sequence > 0) {
    for (let n = 0; n <= sequence; n++) {
      const v = `${n}`
      if (v.includes(search)) {
        nids.push(n)
      }
    }
    const q2: DocumentQuery<Applicant> = { number: { $in: nids } }
    if (q._id !== undefined) {
      q2._id = q._id
    }
    const numbered = await client.findAll<Applicant>(_class, q2, {
      limit: 200,
      lookup: { attachedTo: recruit.mixin.Candidate }
    })
    for (const d of numbered) {
      if (!named.has(d._id)) {
        named.set(d._id, d)
      }
    }
  }

  return Array.from(named.values()).map((e) => ({
    doc: e,
    title: `${shortLabel}-${e.number}`,
    icon: recruit.icon.Application,
    component: ApplicationItem
  }))
}
export async function queryVacancy (
  client: Client,
  search: string,
  filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
): Promise<ObjectSearchResult[]> {
  const _class = recruit.class.Vacancy

  const q: DocumentQuery<Vacancy> = { $search: search }
  if (filter?.in !== undefined || filter?.nin !== undefined) {
    q._id = {}
    if (filter.in !== undefined) {
      q._id.$in = filter.in?.map((it) => it._id as Ref<Vacancy>)
    }
    if (filter.nin !== undefined) {
      q._id.$nin = filter.nin?.map((it) => it._id as Ref<Vacancy>)
    }
  }
  const named = toIdMap(await client.findAll(_class, q, { limit: 200 }))

  if (named.size === 0) {
    const q2: DocumentQuery<Vacancy> = {}
    if (q._id !== undefined) {
      q2._id = q._id
    }
    const numbered = await client.findAll(_class, q2, { limit: 5000, projection: { _id: 1, name: 1, _class: 1 } })
    return numbered
      .filter((it) => it.name.includes(search))
      .map((e) => ({
        doc: e,
        title: `${e.name}`,
        icon: recruit.icon.Vacancy,
        component: VacancyItem
      }))
  }

  return Array.from(named.values()).map((e) => ({
    doc: e,
    title: `${e.name}`,
    icon: recruit.icon.Vacancy,
    component: VacancyItem
  }))
}

async function getActiveTalants (filter: Filter, onUpdate: () => void): Promise<Array<Ref<Doc>>> {
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    let refresh: boolean = false
    const lq = FilterQuery.getLiveQuery(filter.index)
    refresh = lq.query(
      recruit.class.Applicant,
      {
        doneState: undefined
      },
      (refs: FindResult<Applicant>) => {
        const result = Array.from(new Set(refs.map((p) => p.attachedTo)))
        FilterQuery.results.set(filter.index, result)
        resolve(result)
        onUpdate()
      },
      {
        projection: {
          _id: 1,
          _class: 1,
          doneState: 1,
          attachedTo: 1
        }
      }
    )

    if (!refresh) {
      resolve(FilterQuery.results.get(filter.index) ?? [])
    }
  })
  return await promise
}

async function getNoApplicantCandidates (filter: Filter, onUpdate: () => void): Promise<Array<Ref<Doc>>> {
  const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
    let refresh: boolean = false
    const lq = FilterQuery.getLiveQuery(filter.index)
    refresh = lq.query(
      recruit.mixin.Candidate,
      {
        applications: { $in: [0, undefined] }
      },
      (refs: FindResult<Candidate>) => {
        const result = Array.from(refs.map((p) => p._id))
        FilterQuery.results.set(filter.index, result)
        resolve(result)
        onUpdate()
      },
      {
        projection: {
          _id: 1,
          _class: 1,
          applications: 1
        }
      }
    )

    if (!refresh) {
      resolve(FilterQuery.results.get(filter.index) ?? [])
    }
  })
  return await promise
}

async function hasActiveApplicant (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getActiveTalants(filter, onUpdate)
  return { $in: result }
}
async function hasNoActiveApplicant (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getActiveTalants(filter, onUpdate)
  return { $nin: result }
}
async function noneApplicant (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getNoApplicantCandidates(filter, onUpdate)
  return { $in: result }
}

export function hideDoneState (value: any, query: DocumentQuery<Doc>): DocumentQuery<Doc> {
  if (value as boolean) {
    return { ...query, doneState: null }
  }
  return query
}

const activeVacancyQuery = createQuery(true)

let activeVacancies: Promise<Array<Ref<Vacancy>>> | Array<Ref<Vacancy>> | undefined

export async function hideArchivedVacancies (value: any, query: DocumentQuery<Doc>): Promise<DocumentQuery<Doc>> {
  if (activeVacancies === undefined) {
    activeVacancies = new Promise<Array<Ref<Vacancy>>>((resolve) => {
      activeVacancyQuery.query(
        recruit.class.Vacancy,
        { archived: { $ne: true } },
        (res) => {
          activeVacancies = res.map((it) => it._id)
          resolve(activeVacancies)
        },
        { projection: { _id: 1 } }
      )
    })
  }
  if (value as boolean) {
    if (activeVacancies instanceof Promise) {
      activeVacancies = await activeVacancies
    }
    return { ...query, space: { $in: activeVacancies } }
  }
  return query
}

export default async (): Promise<Resources> => ({
  actionImpl: {
    CreateOpinion: createOpinion,
    MoveApplicant
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
    CreateCandidate,
    VacancyPresenter,
    SkillsView,
    Vacancies,
    Organizations,
    VacancyItemPresenter,
    VacancyCountPresenter,
    VacancyModifiedPresenter,

    CreateReview,
    ReviewPresenter,
    EditReview,
    Reviews,
    Opinions,
    OpinionPresenter,
    OpinionsPresenter,

    NewCandidateHeader,

    ApplicantFilter,

    VacancyList,
    VacancyTemplateEditor,

    MatchVacancy,
    NotificationApplicantPresenter
  },
  completion: {
    ApplicationQuery: async (
      client: Client,
      query: string,
      filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }
    ) => await queryApplication(client, query, filter),
    VacancyQuery: async (client: Client, query: string, filter?: { in?: RelatedDocument[], nin?: RelatedDocument[] }) =>
      await queryVacancy(client, query, filter)
  },
  function: {
    AppTitleProvider: getAppTitle,
    VacTitleProvider: getVacTitle,
    RevTitleProvider: getRevTitle,
    IdProvider: getSequenceId,
    GetTalentId: getTalentId,
    HasActiveApplicant: hasActiveApplicant,
    HasNoActiveApplicant: hasNoActiveApplicant,
    NoneApplications: noneApplicant,
    GetObjectLink: objectLinkProvider,
    GetObjectLinkFragment: getSequenceLink,
    GetIdObjectLinkFragment: getObjectLink,
    HideDoneState: hideDoneState,
    HideArchivedVacancies: hideArchivedVacancies
  },
  resolver: {
    Location: resolveLocation
  }
})
