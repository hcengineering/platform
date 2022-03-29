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
import { Document, Issue, IssuePriority, IssueStatus, Team } from '@anticrm/spuristo'
import spuristo from './plugin'

export { createDeps } from './creation'
export { spuristoOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_SPURISTO = 'spuristo' as Domain

/**
 * @public
 */
@Model(spuristo.class.Team, core.class.Space, DOMAIN_SPACE)
@UX(spuristo.string.Team, spuristo.icon.Team, spuristo.string.Team)
export class TTeam extends TSpace implements Team {
   @Prop(TypeString(), spuristo.string.Title)
   @Index(IndexKind.FullText)
   reamLogo!: IntlString

   @Prop(TypeString(), spuristo.string.Identifier)
   @Index(IndexKind.FullText)
   identifier!: IntlString

   @Prop(TypeNumber(), spuristo.string.Number)
   @Hidden()
   sequence!: number
}

/**
 * @public
 */
@Model(spuristo.class.Issue, core.class.Doc, DOMAIN_SPURISTO)
@UX(spuristo.string.Issue, spuristo.icon.Issue, spuristo.string.Issue)
export class TIssue extends TDoc implements Issue {
  @Prop(TypeString(), spuristo.string.Title)
  @Index(IndexKind.FullText)
  title!: string

  @Prop(TypeMarkup(), spuristo.string.Description)
  @Index(IndexKind.FullText)
  description!: Markup

  @Prop(TypeNumber(), spuristo.string.Status)
  status!: IssueStatus

  @Prop(TypeNumber(), spuristo.string.Priority)
  priority!: IssuePriority

  @Prop(TypeNumber(), spuristo.string.Number)
  number!: number

  @Prop(TypeRef(contact.class.Employee), spuristo.string.Assignee)
  assignee!: Ref<Employee> | null

  @Prop(TypeRef(spuristo.class.Issue), spuristo.string.Parent)
  parentIssue!: Ref<Issue>

  @Prop(Collection(spuristo.class.Issue), spuristo.string.BlockedBy)
  blockedBy!: Ref<Issue>[]

  @Prop(Collection(spuristo.class.Issue), spuristo.string.RelatedTo)
  relatedIssue!: Ref<Issue>[]

  @Prop(Collection(chunter.class.Comment), spuristo.string.Comments)
  comments!: number

  @Prop(Collection(attachment.class.Attachment), spuristo.string.Attachments)
  attachments!: number

  // @Prop(Collection(core.class.TypeString), spuristo.string.Labels)
  labels?: string[]

  declare space: Ref<Team>

  @Prop(TypeDate(true), spuristo.string.Number)
  dueDate!: Timestamp | null

  @Prop(TypeString(), spuristo.string.Rank)
  @Hidden()
  rank!: string
}

/**
 * @public
 */
@Model(spuristo.class.Document, core.class.Doc, DOMAIN_SPURISTO)
@UX(spuristo.string.Document, spuristo.icon.Document, spuristo.string.Document)
export class TDocument extends TDoc implements Document {
   @Prop(TypeString(), spuristo.string.Title)
   @Index(IndexKind.FullText)
   title!: string

   @Prop(TypeString(), spuristo.string.DocumentIcon)
   icon!: string | null

   @Prop(TypeString(), spuristo.string.DocumentColor)
   color!: number

   @Prop(TypeMarkup(), spuristo.string.Description)
   @Index(IndexKind.FullText)
   content!: Markup

   declare space: Ref<Team>
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TTeam,
    TIssue
  )
}
