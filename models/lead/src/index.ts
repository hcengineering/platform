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

// To help typescript locate view plugin properly
import type { Employee } from '@anticrm/contact'
import type { Doc, FindOptions, Lookup, Ref } from '@anticrm/core'
import type { Customer, Funnel, Lead } from '@anticrm/lead'
import { Builder, Collection, Mixin, Model, Prop, TypeRef, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact, { TPerson } from '@anticrm/model-contact'
import core from '@anticrm/model-core'
import task, { TSpaceWithStates, TTask } from '@anticrm/model-task'
import view from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import type { IntlString } from '@anticrm/platform'
import type {} from '@anticrm/view'
import lead from './plugin'

@Model(lead.class.Funnel, task.class.SpaceWithStates)
@UX(lead.string.Funnel, lead.icon.Funnel)
export class TFunnel extends TSpaceWithStates implements Funnel {}

@Model(lead.class.Lead, task.class.Task)
@UX('Lead' as IntlString, lead.icon.Lead, undefined, 'title')
export class TLead extends TTask implements Lead {
  @Prop(TypeRef(contact.class.Contact), lead.string.Customer)
  declare attachedTo: Ref<Customer>

  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  @Prop(Collection(chunter.class.Comment), 'Comments' as IntlString)
  comments?: number

  @Prop(Collection(attachment.class.Attachment), 'Attachments' as IntlString)
  attachments?: number

  @Prop(TypeRef(contact.class.Employee), 'Assignee' as IntlString)
  declare assignee: Ref<Employee> | null
}

@Mixin(lead.mixin.Customer, contact.class.Contact)
@UX('Customer' as IntlString, lead.icon.LeadApplication)
export class TCustomer extends TPerson implements Customer {
  @Prop(Collection(lead.class.Lead), 'Leads' as IntlString)
  leads?: number

  @Prop(TypeString(), 'Description' as IntlString)
  description!: string
}

export function createModel (builder: Builder): void {
  builder.createModel(TFunnel, TLead, TCustomer)

  builder.mixin(lead.class.Funnel, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: lead.class.Lead,
      createItemDialog: lead.component.CreateLead
    }
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: lead.string.LeadApplication,
      icon: lead.icon.LeadApplication,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'customers',
            label: lead.string.Customers,
            icon: contact.icon.Person, // <-- Put contact general icon here.
            component: lead.component.Customers,
            position: 'bottom'
          }
        ],
        spaces: [
          {
            label: lead.string.Funnels,
            spaceClass: lead.class.Funnel,
            addSpaceLabel: lead.string.CreateFunnel,
            createComponent: lead.component.CreateFunnel
          }
        ]
      }
    },
    lead.app.Lead
  )
  builder.createDoc(
    lead.class.Funnel,
    core.space.Model,
    {
      name: 'Funnel',
      description: 'Default funnel',
      private: false,
      archived: false,
      members: []
    },
    lead.space.DefaultFunnel
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.mixin.Customer,
    descriptor: view.viewlet.Table,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: { _id: { channels: contact.class.Channel } } as any
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      { key: 'leads', presenter: lead.component.LeadsPresenter, label: lead.string.Leads },
      'modifiedOn',
      '$lookup.channels'
    ]
  })

  const leadLookup: Lookup<Lead> =
  {
    attachedTo: [contact.class.Contact, { _id: { channels: lead.mixin.Customer } }],
    state: task.class.State
  }

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.class.Lead,
    descriptor: view.viewlet.Table,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: leadLookup
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.state',
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files', sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments', sortingKey: 'comments' },
      'modifiedOn',
      '$lookup.attachedTo.$lookup.channels'
    ]
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.class.Lead,
    descriptor: task.viewlet.Kanban,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        attachedTo: lead.mixin.Customer
      }
    } as FindOptions<Doc>, // TODO: fix
    config: []
  })

  builder.mixin(lead.class.Lead, core.class.Class, task.mixin.KanbanCard, {
    card: lead.component.KanbanCard
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ObjectEditor, {
    editor: lead.component.EditLead
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.AttributePresenter, {
    presenter: lead.component.LeadPresenter
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.AttributeEditor, {
    editor: lead.component.Leads
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: 'Funnels',
      description: 'Manage funnel statuses',
      members: [],
      private: false,
      archived: false,
      icon: lead.component.TemplatesIcon
    },
    lead.space.FunnelTemplates
  )
}

export { createDeps } from './creation'
export { leadOperation } from './migration'
export { default } from './plugin'
