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

import type { Status, Client, Doc, Ref } from '@hcengineering/core'
import { type NotificationGroup, type NotificationType } from '@hcengineering/notification'
import type { IntlString, Resource, Status as OperationStatus } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import { recruitId } from '@hcengineering/recruit'
import recruit from '@hcengineering/recruit-resources/src/plugin'
import { type TaskTypeDescriptor, type ProjectType } from '@hcengineering/task'
import type { AnyComponent, Location } from '@hcengineering/ui/src/types'
import type {
  Action,
  ActionCategory,
  ViewAction,
  ViewActionAvailabilityFunction,
  ViewQueryAction,
  Viewlet
} from '@hcengineering/view'
import { type DocUpdateMessageViewlet } from '@hcengineering/activity'
import { type ChatMessageViewlet } from '@hcengineering/chunter'

export default mergeIds(recruitId, recruit, {
  action: {
    CreateOpinion: '' as Ref<Action>,
    CreateGlobalApplication: '' as Ref<Action<Doc, any>>,
    CopyApplicationId: '' as Ref<Action<Doc, any>>,
    CopyApplicationLink: '' as Ref<Action<Doc, any>>,
    CopyCandidateLink: '' as Ref<Action<Doc, any>>,
    MoveApplicant: '' as Ref<Action>,
    GetTalentIds: '' as Ref<Action<Doc, any>>,
    WriteEmail: '' as Ref<Action<Doc, any>>,
    EditStatuses: '' as Ref<Action>
  },
  actionImpl: {
    CreateOpinion: '' as ViewAction,
    MoveApplicant: '' as ViewAction
  },
  category: {
    Recruit: '' as Ref<ActionCategory>
  },
  function: {
    GetObjectLinkFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    GetIdObjectLinkFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    GetObjectLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<string>>,
    GetTalentId: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<string>>,
    HideDoneState: '' as ViewQueryAction,
    HideArchivedVacancies: '' as ViewQueryAction,
    ApplicantHasEmail: '' as Resource<ViewActionAvailabilityFunction>,
    ParseLinkId: '' as Resource<(id: string) => Promise<Ref<Doc> | undefined>>,
    IsApplicationsSpecial: '' as Resource<() => Promise<boolean>>
  },
  string: {
    ApplicationsShort: '' as IntlString,
    TalentPools: '' as IntlString,
    SearchApplication: '' as IntlString,
    SearchVacancy: '' as IntlString,
    AssignedRecruiter: '' as IntlString,
    Due: '' as IntlString,
    Source: '' as IntlString,
    ManageVacancyStatuses: '' as IntlString,
    EditVacancy: '' as IntlString,
    GotoTalents: '' as IntlString,
    GotoVacancies: '' as IntlString,
    GotoSkills: '' as IntlString,
    GotoMyApplications: '' as IntlString,
    GotoApplicants: '' as IntlString,
    GotoRecruitApplication: '' as IntlString,
    VacancyList: '' as IntlString,
    ConfigDescription: '' as IntlString,
    ShowApplications: '' as IntlString,
    HideDoneState: '' as IntlString,
    HideArchivedVacancies: '' as IntlString,
    HideApplicantsFromArchivedVacancies: '' as IntlString
  },
  validator: {
    ApplicantValidator: '' as Resource<<T extends Doc>(doc: T, client: Client) => Promise<OperationStatus>>
  },
  ids: {
    VacancyNotificationGroup: '' as Ref<NotificationGroup>,
    CandidateNotificationGroup: '' as Ref<NotificationGroup>,
    ReviewNotificationGroup: '' as Ref<NotificationGroup>,
    ApplicationNotificationGroup: '' as Ref<NotificationGroup>,
    AssigneeNotification: '' as Ref<NotificationType>,
    ApplicationCreateNotification: '' as Ref<NotificationType>,
    ReviewCreateNotification: '' as Ref<NotificationType>,
    ApplicantUpdatedActivityViewlet: '' as Ref<DocUpdateMessageViewlet>,
    ApplicantChatMessageViewlet: '' as Ref<ChatMessageViewlet>,
    VacancyChatMessageViewlet: '' as Ref<ChatMessageViewlet>,
    ReviewChatMessageViewlet: '' as Ref<ChatMessageViewlet>
  },
  component: {
    CreateApplication: '' as AnyComponent,
    KanbanCard: '' as AnyComponent,
    ApplicationPresenter: '' as AnyComponent,
    ApplicationsPresenter: '' as AnyComponent,
    VacancyPresenter: '' as AnyComponent,
    EditApplication: '' as AnyComponent,
    TemplatesIcon: '' as AnyComponent,
    Applications: '' as AnyComponent,
    SkillsView: '' as AnyComponent,
    Vacancies: '' as AnyComponent,
    Organizations: '' as AnyComponent,
    OrganizationSpacePresenter: '' as AnyComponent,
    CreateOrganization: '' as AnyComponent,

    CreateReview: '' as AnyComponent,
    Reviews: '' as AnyComponent,
    KanbanReviewCard: '' as AnyComponent,
    EditReview: '' as AnyComponent,
    ReviewPresenter: '' as AnyComponent,
    Opinions: '' as AnyComponent,
    OpinionPresenter: '' as AnyComponent,
    NewCandidateHeader: '' as AnyComponent,
    ApplicantFilter: '' as AnyComponent,
    VacancyList: '' as AnyComponent,
    VacancyTemplateEditor: '' as AnyComponent,
    ApplicationMatchPresenter: '' as AnyComponent,

    NotificationApplicantPresenter: '' as AnyComponent,
    VacancyEditor: '' as AnyComponent,
    ApplicantNamePresenter: '' as AnyComponent
  },
  template: {
    DefaultVacancy: '' as Ref<ProjectType>
  },
  viewlet: {
    TableCandidate: '' as Ref<Viewlet>,
    TableVacancy: '' as Ref<Viewlet>,
    ListVacancy: '' as Ref<Viewlet>,
    ApplicantTable: '' as Ref<Viewlet>,
    ApplicantKanban: '' as Ref<Viewlet>,
    ListApplicant: '' as Ref<Viewlet>,
    ListTalent: '' as Ref<Viewlet>,
    ListCompanies: '' as Ref<Viewlet>,
    TableApplicant: '' as Ref<Viewlet>,
    TableApplicantMatch: '' as Ref<Viewlet>,
    CalendarReview: '' as Ref<Viewlet>,
    TableReview: '' as Ref<Viewlet>,
    TableVacancyList: '' as Ref<Viewlet>,
    ApplicantDashboard: '' as Ref<Viewlet>
  },
  descriptors: {
    Application: '' as Ref<TaskTypeDescriptor>
  },
  taskTypeStatus: {
    Backlog: '' as Ref<Status>,
    HRInterview: '' as Ref<Status>,
    TechnicalInterview: '' as Ref<Status>,
    TestTask: '' as Ref<Status>,
    Offer: '' as Ref<Status>,
    Won: '' as Ref<Status>,
    Lost: '' as Ref<Status>
  }
})
