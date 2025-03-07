//
// Copyright © 2024 Hardcore Engineering Inc.
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

import type { Employee } from '@hcengineering/contact'
import {
  IndexKind,
  type MarkupBlobRef,
  type Role,
  type RolesAssignment,
  type Ref,
  type Status,
  type Timestamp,
  type AccountUuid
} from '@hcengineering/core'
import { type Customer, type Funnel, type Lead } from '@hcengineering/lead'
import {
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeCollaborativeDoc,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import contact, { TContact } from '@hcengineering/model-contact'
import core from '@hcengineering/model-core'
import task, { TProject, TTask } from '@hcengineering/model-task'

import lead from './plugin'
import { getEmbeddedLabel } from '@hcengineering/platform'

export { leadId } from '@hcengineering/lead'
export { leadOperation } from './migration'
export { default } from './plugin'

@Model(lead.class.Funnel, task.class.Project)
@UX(lead.string.Funnel, lead.icon.Funnel)
export class TFunnel extends TProject implements Funnel {
  @Prop(TypeMarkup(), lead.string.FullDescription)
  @Index(IndexKind.FullText)
    fullDescription?: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number
}

@Model(lead.class.Lead, task.class.Task)
@UX(lead.string.Lead, lead.icon.Lead, 'LEAD', 'title', undefined, lead.string.Leads)
export class TLead extends TTask implements Lead {
  @Prop(TypeRef(contact.class.Contact), lead.string.Customer)
  @ReadOnly()
  declare attachedTo: Ref<Customer>

  @Prop(TypeDate(), task.string.StartDate)
    startDate!: Timestamp | null

  @Prop(TypeString(), lead.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(TypeRef(contact.mixin.Employee), lead.string.Assignee)
  declare assignee: Ref<Employee> | null

  @Prop(TypeRef(core.class.Status), task.string.TaskState, { _id: lead.attribute.State })
  declare status: Ref<Status>

  declare space: Ref<Funnel>
}

@Mixin(lead.mixin.Customer, contact.class.Contact)
@UX(lead.string.Customer, lead.icon.LeadApplication, undefined, undefined, undefined, lead.string.Customers)
export class TCustomer extends TContact implements Customer {
  @Prop(Collection(lead.class.Lead), lead.string.Leads)
    leads?: number

  @Prop(TypeCollaborativeDoc(), lead.string.Description)
  @Index(IndexKind.FullText)
    customerDescription!: MarkupBlobRef | null
}

@Mixin(lead.mixin.DefaultFunnelTypeData, lead.class.Funnel)
@UX(getEmbeddedLabel('Default funnel'), lead.icon.Funnel)
export class TDefaultFunnelTypeData extends TFunnel implements RolesAssignment {
  [key: Ref<Role>]: AccountUuid[]
}

@Mixin(lead.mixin.LeadTypeData, lead.class.Lead)
@UX(getEmbeddedLabel('Lead'), lead.icon.Lead)
export class TLeadTypeData extends TLead {}
