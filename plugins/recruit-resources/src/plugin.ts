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

import { Ref, Space } from '@anticrm/core'
import type { IntlString, StatusCode } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import recruit, { recruitId } from '@anticrm/recruit'
import { TagCategory } from '@anticrm/tags'
import { AnyComponent } from '@anticrm/ui'

export default mergeIds(recruitId, recruit, {
  status: {
    ApplicationExists: '' as StatusCode,
    CandidateRequired: '' as StatusCode,
    VacancyRequired: '' as StatusCode,
    ReviewCategoryRequired: '' as StatusCode
  },
  string: {
    CreateVacancy: '' as IntlString,
    VacancyName: '' as IntlString,
    VacancyPlaceholder: '' as IntlString,
    VacancyDescription: '' as IntlString,
    MakePrivate: '' as IntlString,
    MakePrivateDescription: '' as IntlString,
    CandidatesDescription: '' as IntlString,
    CreateAnApplication: '' as IntlString,
    NoApplicationsForCandidate: '' as IntlString,
    FirstName: '' as IntlString,
    LastName: '' as IntlString,
    Candidates: '' as IntlString,
    CreateApplication: '' as IntlString,
    ApplicationCreateLabel: '' as IntlString,
    Vacancy: '' as IntlString,
    VacancyCreateLabel: '' as IntlString,
    SelectVacancy: '' as IntlString,
    Candidate: '' as IntlString,
    CandidateCreateLabel: '' as IntlString,
    CreateCandidate: '' as IntlString,
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

    Review: '' as IntlString,
    ReviewCreateLabel: '' as IntlString,
    ReviewCategory: '' as IntlString,
    CreateReviewCategory: '' as IntlString,
    ReviewCategoryName: '' as IntlString,
    ReviewCategoryTitle: '' as IntlString,
    ReviewCategoryPlaceholder: '' as IntlString,
    ReviewCategoryDescription: '' as IntlString,
    ThisReviewCategoryIsPrivate: '' as IntlString,
    CreateReview: '' as IntlString,
    CreateReviewParams: '' as IntlString,
    SelectReviewCategory: '' as IntlString,
    Reviews: '' as IntlString,
    NoReviewForCandidate: '' as IntlString,
    CreateAnReview: '' as IntlString,
    CreateOpinion: '' as IntlString,
    Opinion: '' as IntlString,
    OpinionValue: '' as IntlString,
    OpinionValuePlaceholder: '' as IntlString,
    OpinionSave: '' as IntlString,
    Opinions: '' as IntlString,
    OpinionShortLabel: '' as IntlString,
    ReviewShortLabel: '' as IntlString,
    StartDate: '' as IntlString,
    DueDate: '' as IntlString,
    CandidateReviews: '' as IntlString,
    AddDescription: '' as IntlString,
    NumberSkills: '' as IntlString,
    AddDropHere: '' as IntlString
  },
  space: {
    CandidatesPublic: '' as Ref<Space>
  },
  category: {
    Other: '' as Ref<TagCategory>,
    Category: '' as Ref<TagCategory>,
    OtherLabel: '' as Ref<TagCategory>
  },
  component: {
    VacancyItemPresenter: '' as AnyComponent,
    VacancyCountPresenter: '' as AnyComponent,
    OpinionsPresenter: '' as AnyComponent,
    VacancyModifiedPresenter: '' as AnyComponent,
    EditReviewCategory: '' as AnyComponent,
    CreateVacancy: '' as AnyComponent,
    CreateCandidate: '' as AnyComponent
  }
})
