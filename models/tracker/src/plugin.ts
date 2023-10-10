//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { Doc, Ref } from '@hcengineering/core'
import { ObjectSearchCategory, ObjectSearchFactory } from '@hcengineering/model-presentation'
import { IntlString, mergeIds, Resource } from '@hcengineering/platform'
import { trackerId } from '@hcengineering/tracker'
import tracker from '@hcengineering/tracker-resources/src/plugin'
import type { AnyComponent } from '@hcengineering/ui/src/types'
import { Action, ViewAction, Viewlet } from '@hcengineering/view'
import { Application } from '@hcengineering/workbench'
import { TxViewlet } from '@hcengineering/activity'
import { NotificationGroup, NotificationType } from '@hcengineering/notification'

export default mergeIds(trackerId, tracker, {
  string: {
    TrackerApplication: '' as IntlString,
    Projects: '' as IntlString,
    GotoIssues: '' as IntlString,
    GotoActive: '' as IntlString,
    GotoBacklog: '' as IntlString,
    GotoComponents: '' as IntlString,
    GotoTrackerApplication: '' as IntlString,
    GotoMyIssues: '' as IntlString,
    SearchIssue: '' as IntlString,
    Parent: '' as IntlString,
    CreatedDate: '' as IntlString,
    ChangeStatus: '' as IntlString,
    ConfigDescription: '' as IntlString,
    Unarchive: '' as IntlString,
    UnarchiveConfirm: '' as IntlString,
    AllProjects: '' as IntlString,
    RemainingTime: '' as IntlString,
    MapRelatedIssues: '' as IntlString
  },
  activity: {
    TxIssueCreated: '' as AnyComponent,
    StatusIcon: '' as AnyComponent,
    PriorityIcon: '' as AnyComponent
  },
  component: {
    MilestoneSelector: '' as AnyComponent,
    IssueStatistics: '' as AnyComponent,
    TimeSpendReportPopup: '' as AnyComponent,
    NotificationIssuePresenter: '' as AnyComponent,
    MilestoneFilter: '' as AnyComponent,
    EditRelatedTargets: '' as AnyComponent,
    EditRelatedTargetsPopup: '' as AnyComponent
  },
  app: {
    Tracker: '' as Ref<Application>
  },
  viewlet: {
    IssueList: '' as Ref<Viewlet>,
    IssueTemplateList: '' as Ref<Viewlet>,
    IssueKanban: '' as Ref<Viewlet>,
    MilestoneList: '' as Ref<Viewlet>,
    ComponentList: '' as Ref<Viewlet>,
    ProjectList: '' as Ref<Viewlet>
  },
  ids: {
    TxIssueCreated: '' as Ref<TxViewlet>,
    TrackerNotificationGroup: '' as Ref<NotificationGroup>,
    AssigneeNotification: '' as Ref<NotificationType>
  },
  completion: {
    IssueQuery: '' as Resource<ObjectSearchFactory>,
    IssueCategory: '' as Ref<ObjectSearchCategory>
  },
  actionImpl: {
    Move: '' as ViewAction,
    CopyToClipboard: '' as ViewAction,
    EditWorkflowStatuses: '' as ViewAction,
    EditProject: '' as ViewAction,
    DeleteProject: '' as ViewAction,
    DeleteIssue: '' as ViewAction,
    DeleteMilestone: '' as ViewAction
  },
  action: {
    NewRelatedIssue: '' as Ref<Action<Doc, Record<string, any>>>,
    DeleteMilestone: '' as Ref<Action<Doc, Record<string, any>>>,
    DeleteProject: '' as Ref<Action<Doc, Record<string, any>>>,
    DeleteProjectClean: '' as Ref<Action<Doc, Record<string, any>>>,
    DeleteIssue: '' as Ref<Action<Doc, Record<string, any>>>
  }
})
