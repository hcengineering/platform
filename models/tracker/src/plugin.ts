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

import { Ref } from '@anticrm/core'
import { ObjectSearchCategory, ObjectSearchFactory } from '@anticrm/model-presentation'
import { IntlString, mergeIds, Resource } from '@anticrm/platform'
import { trackerId } from '@anticrm/tracker'
import tracker from '@anticrm/tracker-resources/src/plugin'
import type { AnyComponent } from '@anticrm/ui/src/types'
import { ViewletDescriptor } from '@anticrm/view'
import { Application } from '@anticrm/workbench'

export default mergeIds(trackerId, tracker, {
  string: {
    TrackerApplication: '' as IntlString,
    Teams: '' as IntlString,
    GotoIssues: '' as IntlString,
    GotoActive: '' as IntlString,
    GotoBacklog: '' as IntlString,
    GotoBoard: '' as IntlString,
    GotoProjects: '' as IntlString,
    GotoTrackerApplication: '' as IntlString,
    SearchIssue: '' as IntlString
  },
  component: {
    // Required to pass build without errorsF
    Nope: '' as AnyComponent
  },
  app: {
    Tracker: '' as Ref<Application>
  },
  viewlet: {
    List: '' as Ref<ViewletDescriptor>,
    Kanban: '' as Ref<ViewletDescriptor>
  },
  completion: {
    IssueQuery: '' as Resource<ObjectSearchFactory>,
    IssueCategory: '' as Ref<ObjectSearchCategory>
  }
})
