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

import { Client, Doc, Ref, Space } from '@hcengineering/core'
import type { IntlString, Resource, StatusCode } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import { ObjectSearchCategory, ObjectSearchFactory } from '@hcengineering/presentation'
import recruit, { recruitId } from '@hcengineering/recruit'
import { TagCategory } from '@hcengineering/tags'
import { AnyComponent } from '@hcengineering/ui'
import { FilterFunction, FilterMode, Viewlet } from '@hcengineering/view'

export default mergeIds(recruitId, recruit, {
  viewlet: {
    VacancyApplicationsShort: '' as Ref<Viewlet>,
    VacancyApplicationsEmbeddeed: '' as Ref<Viewlet>
  },
  status: {
    ApplicationExists: '' as StatusCode,
    TalentRequired: '' as StatusCode,
    VacancyRequired: '' as StatusCode
  },
  string: {
    CreateVacancy: '' as IntlString,
    VacancyName: '' as IntlString,
    VacancyPlaceholder: '' as IntlString,
    VacancyDescription: '' as IntlString,
    CandidatesDescription: '' as IntlString,
    CreateAnApplication: '' as IntlString,
    NoApplicationsForTalent: '' as IntlString,
    NoApplicationsForVacancy: '' as IntlString,
    FirstName: '' as IntlString,
    LastName: '' as IntlString,
    Talents: '' as IntlString,
    CreateApplication: '' as IntlString,
    ApplicationCreateLabel: '' as IntlString,
    Vacancy: '' as IntlString,
    VacancyCreateLabel: '' as IntlString,
    CompanyCreateLabel: '' as IntlString,
    SelectVacancy: '' as IntlString,
    Talent: '' as IntlString,
    TalentCreateLabel: '' as IntlString,
    CreateTalent: '' as IntlString,
    CreateTalentDialogClose: '' as IntlString,
    CreateTalentDialogCloseNote: '' as IntlString,
    ResumeDraft: '' as IntlString,
    AssignRecruiter: '' as IntlString,
    Recruiters: '' as IntlString,
    UnAssignRecruiter: '' as IntlString,
    UnAssignCompany: '' as IntlString,
    Create: '' as IntlString,
    Applications: '' as IntlString,
    ThisVacancyIsPrivate: '' as IntlString,
    Description: '' as IntlString,
    Verdict: '' as IntlString,
    Company: '' as IntlString,
    Edit: '' as IntlString,
    Delete: '' as IntlString,
    WorkLocationPreferences: '' as IntlString,
    Onsite: '' as IntlString,
    Remote: '' as IntlString,
    SkillLabel: '' as IntlString,
    SkillsLabel: '' as IntlString,
    SkillCreateLabel: '' as IntlString,
    General: '' as IntlString,
    Members: '' as IntlString,
    Yes: '' as IntlString,
    No: '' as IntlString,
    NA: '' as IntlString,
    PersonFirstNamePlaceholder: '' as IntlString,
    PersonLastNamePlaceholder: '' as IntlString,
    Location: '' as IntlString,
    Title: '' as IntlString,
    Vacancies: '' as IntlString,
    Organizations: '' as IntlString,

    CopyLink: '' as IntlString,
    CopyId: '' as IntlString,

    Review: '' as IntlString,
    ReviewCreateLabel: '' as IntlString,
    NewReview: '' as IntlString,
    CreateReview: '' as IntlString,
    CreateReviewParams: '' as IntlString,
    Reviews: '' as IntlString,
    NoReviewForCandidate: '' as IntlString,
    CreateAnReview: '' as IntlString,
    CreateOpinion: '' as IntlString,
    Opinion: '' as IntlString,
    OpinionValue: '' as IntlString,
    OpinionValuePlaceholder: '' as IntlString,
    OpinionSave: '' as IntlString,
    Opinions: '' as IntlString,
    StartDate: '' as IntlString,
    DueDate: '' as IntlString,
    TalentReviews: '' as IntlString,
    AddDescription: '' as IntlString,
    NumberSkills: '' as IntlString,
    AddDropHere: '' as IntlString,
    Uploading: '' as IntlString,
    Parsing: '' as IntlString,
    TalentSelect: '' as IntlString,
    FullDescription: '' as IntlString,
    HasActiveApplicant: '' as IntlString,
    HasNoActiveApplicant: '' as IntlString,
    NoneApplications: '' as IntlString,

    MatchVacancy: '' as IntlString,
    VacancyMatching: '' as IntlString,
    Score: '' as IntlString,
    Match: '' as IntlString,
    PerformMatch: '' as IntlString,
    MoveApplication: '' as IntlString,
    Application: '' as IntlString,
    MyApplications: '' as IntlString,

    TemplateReplace: '' as IntlString,
    TemplateReplaceConfirm: '' as IntlString,
    Apply: '' as IntlString,
    OpenVacancyList: '' as IntlString,
    Export: '' as IntlString,
    GetTalentIds: '' as IntlString
  },
  space: {
    CandidatesPublic: '' as Ref<Space>
  },
  category: {
    Other: '' as Ref<TagCategory>,
    Category: '' as Ref<TagCategory>
  },
  completion: {
    ApplicationQuery: '' as Resource<ObjectSearchFactory>,
    ApplicationCategory: '' as Ref<ObjectSearchCategory>,
    VacancyCategory: '' as Ref<ObjectSearchCategory>,
    VacancyQuery: '' as Resource<ObjectSearchFactory>
  },
  component: {
    VacancyItemPresenter: '' as AnyComponent,
    VacancyCountPresenter: '' as AnyComponent,
    OpinionsPresenter: '' as AnyComponent,
    VacancyModifiedPresenter: '' as AnyComponent,
    CreateVacancy: '' as AnyComponent,
    CreateCandidate: '' as AnyComponent
  },
  function: {
    IdProvider: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<string>>,
    AppTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>) => Promise<string>>,
    VacTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>) => Promise<string>>,
    RevTitleProvider: '' as Resource<(client: Client, ref: Ref<Doc>) => Promise<string>>,
    HasActiveApplicant: '' as FilterFunction,
    HasNoActiveApplicant: '' as FilterFunction,
    NoneApplications: '' as FilterFunction
  },
  filter: {
    HasActive: '' as Ref<FilterMode>,
    NoActive: '' as Ref<FilterMode>,
    None: '' as Ref<FilterMode>
  }
})
