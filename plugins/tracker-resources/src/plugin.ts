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

import type { IntlString } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import tracker, { trackerId } from '../../tracker/lib'
import { AnyComponent } from '@anticrm/ui'

export default mergeIds(trackerId, tracker, {
  string: {
    More: '' as IntlString,
    Delete: '' as IntlString,
    Open: '' as IntlString,
    Members: '' as IntlString,
    Inbox: '' as IntlString,
    MyIssues: '' as IntlString,
    Issues: '' as IntlString,
    Views: '' as IntlString,
    Active: '' as IntlString,
    Backlog: '' as IntlString,
    Board: '' as IntlString,
    Projects: '' as IntlString,
    CreateTeam: '' as IntlString,
    NewIssue: '' as IntlString,
    Team: '' as IntlString,
    SelectTeam: '' as IntlString,

    Title: '' as IntlString,
    Identifier: '' as IntlString,
    Description: '' as IntlString,
    Status: '' as IntlString,
    Priority: '' as IntlString,
    Number: '' as IntlString,
    Assignee: '' as IntlString,
    Parent: '' as IntlString,
    BlockedBy: '' as IntlString,
    RelatedTo: '' as IntlString,
    Comments: '' as IntlString,
    Attachments: '' as IntlString,
    Labels: '' as IntlString,
    Space: '' as IntlString,
    DueDate: '' as IntlString,
    Issue: '' as IntlString,
    Document: '' as IntlString,
    DocumentIcon: '' as IntlString,
    DocumentColor: '' as IntlString,
    Rank: '' as IntlString,

    IssueTitlePlaceholder: '' as IntlString,
    IssueDescriptionPlaceholder: '' as IntlString,
    TaskUnAssign: '' as IntlString
  },
  component: {
    NopeComponent: '' as AnyComponent,
    Inbox: '' as AnyComponent,
    MyIssues: '' as AnyComponent,
    Issues: '' as AnyComponent,
    Views: '' as AnyComponent,
    Active: '' as AnyComponent,
    Backlog: '' as AnyComponent,
    Board: '' as AnyComponent,
    Projects: '' as AnyComponent,
    IssuePresenter: '' as AnyComponent,
    EditIssue: '' as AnyComponent,
    CreateTeam: '' as AnyComponent,
    NewIssueHeader: '' as AnyComponent
  }
})
