//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import type { Employee } from '@anticrm/contact'
import contact from '@anticrm/contact'
import { Domain, IndexKind, Markup, Ref, Timestamp } from '@anticrm/core'
import {
  Builder,
  Collection, Hidden, Index, Model,
  Prop, TypeDate,
  TypeMarkup,
  TypeNumber,
  TypeRef,
  TypeString,
  UX
} from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import core, { DOMAIN_SPACE, TDoc, TSpace } from '@anticrm/model-core'
import { IntlString } from '@anticrm/platform'
import { Document, Issue, IssuePriority, IssueStatus, Team } from '@anticrm/tracker'
import tracker from './plugin'

import workbench from '@anticrm/model-workbench'

export { createDeps } from './creation'
export { trackerOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_TRACKER = 'tracker' as Domain

/**
 * @public
 */
@Model(tracker.class.Team, core.class.Space, DOMAIN_SPACE)
@UX(tracker.string.Team, tracker.icon.Team, tracker.string.Team)
export class TTeam extends TSpace implements Team {
   @Prop(TypeString(), tracker.string.Title)
   @Index(IndexKind.FullText)
   reamLogo!: IntlString

   @Prop(TypeString(), tracker.string.Identifier)
   @Index(IndexKind.FullText)
   identifier!: IntlString

   @Prop(TypeNumber(), tracker.string.Number)
   @Hidden()
   sequence!: number
}

/**
 * @public
 */
@Model(tracker.class.Issue, core.class.Doc, DOMAIN_TRACKER)
@UX(tracker.string.Issue, tracker.icon.Issue, tracker.string.Issue)
export class TIssue extends TDoc implements Issue {
  @Prop(TypeString(), tracker.string.Title)
  @Index(IndexKind.FullText)
  title!: string

  @Prop(TypeMarkup(), tracker.string.Description)
  @Index(IndexKind.FullText)
  description!: Markup

  @Prop(TypeNumber(), tracker.string.Status)
  status!: IssueStatus

  @Prop(TypeNumber(), tracker.string.Priority)
  priority!: IssuePriority

  @Prop(TypeNumber(), tracker.string.Number)
  number!: number

  @Prop(TypeRef(contact.class.Employee), tracker.string.Assignee)
  assignee!: Ref<Employee> | null

  @Prop(TypeRef(tracker.class.Issue), tracker.string.Parent)
  parentIssue!: Ref<Issue>

  @Prop(Collection(tracker.class.Issue), tracker.string.BlockedBy)
  blockedBy!: Ref<Issue>[]

  @Prop(Collection(tracker.class.Issue), tracker.string.RelatedTo)
  relatedIssue!: Ref<Issue>[]

  @Prop(Collection(chunter.class.Comment), tracker.string.Comments)
  comments!: number

  @Prop(Collection(attachment.class.Attachment), tracker.string.Attachments)
  attachments!: number

  // @Prop(Collection(core.class.TypeString), tracker.string.Labels)
  labels?: string[]

  declare space: Ref<Team>

  @Prop(TypeDate(true), tracker.string.Number)
  dueDate!: Timestamp | null

  @Prop(TypeString(), tracker.string.Rank)
  @Hidden()
  rank!: string
}

/**
 * @public
 */
@Model(tracker.class.Document, core.class.Doc, DOMAIN_TRACKER)
@UX(tracker.string.Document, tracker.icon.Document, tracker.string.Document)
export class TDocument extends TDoc implements Document {
   @Prop(TypeString(), tracker.string.Title)
   @Index(IndexKind.FullText)
   title!: string

   @Prop(TypeString(), tracker.string.DocumentIcon)
   icon!: string | null

   @Prop(TypeString(), tracker.string.DocumentColor)
   color!: number

   @Prop(TypeMarkup(), tracker.string.Description)
   @Index(IndexKind.FullText)
   content!: Markup

   declare space: Ref<Team>
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TTeam,
    TIssue
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: tracker.string.TrackerApplication,
      icon: tracker.icon.Issue,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'inbox',
            position: 'top',
            label: tracker.string.Inbox,
            icon: tracker.icon.TrackerApplication,
            component: tracker.component.Inbox
          },
          {
            id: 'my-issues',
            position: 'top',
            label: tracker.string.MyIssues,
            icon: tracker.icon.TrackerApplication,
            component: tracker.component.MyIssues
          },
          {
            id: 'views',
            position: 'top',
            label: tracker.string.Views,
            icon: tracker.icon.TrackerApplication,
            component: tracker.component.Views
          }
        ],
        spaces: [
          {
            label: tracker.string.Teams,
            spaceClass: tracker.class.Team,
            // icon: tracker.icon.TrackerApplication,
            addSpaceLabel: tracker.string.CreateTeam,
            createComponent: tracker.component.CreateTeam,
            specials: [
              {
                id: 'issues',
                label: tracker.string.Issues,
                icon: tracker.icon.TrackerApplication,
                component: tracker.component.Issues
              },
              {
                id: 'active',
                label: tracker.string.Active,
                // icon: tracker.icon.TrackerApplication,
                component: tracker.component.Active
              },
              {
                id: 'backlog',
                label: tracker.string.Backlog,
                // icon: tracker.icon.TrackerApplication,
                component: tracker.component.Backlog
              },
              {
                id: 'board',
                label: tracker.string.Board,
                // icon: tracker.icon.TrackerApplication,
                component: tracker.component.Board
              },
              {
                id: 'projects',
                label: tracker.string.Projects,
                icon: tracker.icon.TrackerApplication,
                component: tracker.component.Projects
              }
            ]
          }]
      },
      navHeaderComponent: tracker.component.NewIssueHeader
    },
    tracker.app.Tracker
  )
}
