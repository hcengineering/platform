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
import type { Contact, Employee } from '@anticrm/contact'
import type { Doc, FindOptions, Ref } from '@anticrm/core'
import type { Funnel, Lead } from '@anticrm/lead'
import { createKanban } from '@anticrm/lead'
import { Builder, Collection, Model, Prop, TypeRef, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact from '@anticrm/model-contact'
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
  @Prop(TypeString(), 'Title' as IntlString)
  title!: string

  @Prop(TypeRef(contact.class.Contact), lead.string.Customer)
  customer!: Ref<Contact>

  @Prop(Collection(chunter.class.Comment), 'Comments' as IntlString)
  comments?: number

  @Prop(Collection(attachment.class.Attachment), 'Attachments' as IntlString)
  attachments?: number

  @Prop(TypeRef(contact.class.Employee), 'Assignee' as IntlString)
  declare assignee: Ref<Employee> | null
}

export function createModel (builder: Builder): void {
  builder.createModel(TFunnel, TLead)

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
      members: []
    },
    lead.space.DefaultFunnel
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.class.Lead,
    descriptor: view.viewlet.Table,
    open: contact.component.EditContact,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        customer: contact.class.Contact,
        state: task.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: [
      '',
      '$lookup.customer',
      '$lookup.state',
      { presenter: attachment.component.AttachmentsPresenter, label: 'Files', sortingKey: 'attachments' },
      { presenter: chunter.component.CommentsPresenter, label: 'Comments', sortingKey: 'comments' },
      'modifiedOn',
      '$lookup.customer.channels'
    ]
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.class.Lead,
    descriptor: task.viewlet.Kanban,
    open: contact.component.EditContact,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options: {
      lookup: {
        customer: contact.class.Contact,
        state: task.class.State
      }
    } as FindOptions<Doc>, // TODO: fix
    config: ['$lookup.customer', '$lookup.state']
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

  builder.createDoc(task.class.Sequence, task.space.Sequence, {
    attachedTo: lead.class.Lead,
    sequence: 0
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: 'Funnels',
      description: 'Manage funnel statuses',
      members: [],
      private: false,
      icon: lead.component.TemplatesIcon
    },
    lead.space.FunnelTemplates
  )

  createKanban(lead.space.DefaultFunnel, async (_class, space, data, id) => {
    builder.createDoc(_class, space, data, id)
    return await Promise.resolve()
  }).catch((err) => console.error(err))
}

export { leadOperation } from './migration'
export { default } from './plugin'
