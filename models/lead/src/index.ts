//
// Copyright © 2022 Hardcore Engineering Inc.
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
import { Class, Doc, FindOptions, IndexKind, Ref } from '@anticrm/core'
import type { Customer, Funnel, Lead } from '@anticrm/lead'
import { Builder, Collection, Index, Mixin, Model, Prop, TypeRef, TypeString, UX } from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'
import contact, { TContact } from '@anticrm/model-contact'
import core from '@anticrm/model-core'
import task, { TSpaceWithStates, TTask } from '@anticrm/model-task'
import view, { createAction } from '@anticrm/model-view'
import workbench, { Application } from '@anticrm/model-workbench'
import setting from '@anticrm/setting'
import lead from './plugin'

@Model(lead.class.Funnel, task.class.SpaceWithStates)
@UX(lead.string.Funnel, lead.icon.Funnel)
export class TFunnel extends TSpaceWithStates implements Funnel {}

@Model(lead.class.Lead, task.class.Task)
@UX(lead.string.Lead, lead.icon.Lead, undefined, 'title')
export class TLead extends TTask implements Lead {
  @Prop(TypeRef(contact.class.Contact), lead.string.Customer)
  declare attachedTo: Ref<Customer>

  @Prop(TypeString(), lead.string.Title)
  @Index(IndexKind.FullText)
  title!: string

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, undefined, attachment.string.Files)
  attachments?: number

  @Prop(TypeRef(contact.class.Employee), lead.string.Assignee)
  declare assignee: Ref<Employee> | null
}

@Mixin(lead.mixin.Customer, contact.class.Contact)
@UX(lead.string.Customer, lead.icon.LeadApplication)
export class TCustomer extends TContact implements Customer {
  @Prop(Collection(lead.class.Lead), lead.string.Leads)
  leads?: number

  @Prop(TypeString(), core.string.Description)
  @Index(IndexKind.FullText)
  description!: string

  @Prop(TypeRef(core.class.Class), core.string.ClassLabel)
  declare _class: Ref<Class<this>>
}

export function createModel (builder: Builder): void {
  builder.createModel(TFunnel, TLead, TCustomer)

  builder.mixin(lead.class.Funnel, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: lead.class.Lead,
      createItemDialog: lead.component.CreateLead,
      createItemLabel: lead.string.LeadCreateLabel
    }
  })

  builder.mixin(lead.class.Lead, core.class.Class, setting.mixin.Editable, {})

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
            id: 'spaceBrowser',
            component: workbench.component.SpaceBrowser,
            icon: workbench.icon.Search,
            label: lead.string.FunnelBrowser,
            position: 'top',
            spaceClass: lead.class.Funnel,
            componentProps: {
              _class: lead.class.Funnel,
              label: lead.string.FunnelBrowser,
              createItemDialog: lead.component.CreateFunnel,
              createItemLabel: lead.string.CreateFunnel
            }
          },
          {
            id: 'customers',
            label: lead.string.Customers,
            icon: contact.icon.Person, // <-- Put contact general icon here.
            component: lead.component.Customers,
            position: 'top'
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
      },
      navHeaderComponent: lead.component.NewItemsHeader
    },
    lead.app.Lead
  )

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.mixin.Customer,
    descriptor: view.viewlet.Table,
    config: [
      '',
      '$lookup._class',
      'leads',
      'modifiedOn',
      '$lookup.channels'
    ],
    hiddenKeys: ['name']
  })

  builder.createDoc(view.class.Viewlet, core.space.Model, {
    attachTo: lead.class.Lead,
    descriptor: task.viewlet.StatusTable,
    config: [
      '',
      '$lookup.attachedTo',
      '$lookup.state',
      '$lookup.doneState',
      'attachments',
      'comments',
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

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: lead.component.LeadsPresenter
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.CollectionEditor, {
    editor: lead.component.Leads
  })

  builder.createDoc(
    task.class.KanbanTemplateSpace,
    core.space.Model,
    {
      name: lead.string.Funnels,
      description: lead.string.ManageFunnelStatuses,
      icon: lead.component.TemplatesIcon
    },
    lead.space.FunnelTemplates
  )

  createAction(builder, {
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'app',
      application: lead.app.Lead as Ref<Application>
    },
    label: lead.string.GotoLeadApplication,
    icon: view.icon.ArrowRight,
    input: 'none',
    category: view.category.Navigation,
    target: core.class.Doc,
    context: {
      mode: ['workbench', 'browser', 'editor', 'panel', 'popup']
    }
  })

  builder.mixin(lead.mixin.Customer, core.class.Mixin, view.mixin.ObjectFactory, {
    component: lead.component.CreateCustomer
  })
}

export { leadOperation } from './migration'
export { default } from './plugin'
