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
import type { Employee } from '@hcengineering/contact'
import { FindOptions, IndexKind, Ref, SortingOrder } from '@hcengineering/core'
import { Customer, Funnel, Lead, leadId } from '@hcengineering/lead'
import {
  Builder,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import contact, { TContact } from '@hcengineering/model-contact'
import core from '@hcengineering/model-core'
import task, { TSpaceWithStates, TTask, actionTemplates } from '@hcengineering/model-task'
import view, { createAction, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import setting from '@hcengineering/setting'
import { ViewOptionsModel } from '@hcengineering/view'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import notification from '@hcengineering/notification'
import lead from './plugin'

@Model(lead.class.Funnel, task.class.SpaceWithStates)
@UX(lead.string.Funnel, lead.icon.Funnel)
export class TFunnel extends TSpaceWithStates implements Funnel {
  @Prop(TypeMarkup(), lead.string.FullDescription)
  @Index(IndexKind.FullText)
    fullDescription?: string

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number
}

@Model(lead.class.Lead, task.class.Task)
@UX(lead.string.Lead, lead.icon.Lead, undefined, 'title')
export class TLead extends TTask implements Lead {
  @Prop(TypeRef(contact.class.Contact), lead.string.Customer)
  @ReadOnly()
  declare attachedTo: Ref<Customer>

  @Prop(TypeString(), lead.string.Title)
  @Index(IndexKind.FullText)
    title!: string

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeRef(contact.class.Employee), lead.string.Assignee)
  declare assignee: Ref<Employee> | null
}

@Mixin(lead.mixin.Customer, contact.class.Contact)
@UX(lead.string.Customer, lead.icon.LeadApplication)
export class TCustomer extends TContact implements Customer {
  @Prop(Collection(lead.class.Lead), lead.string.Leads)
    leads?: number

  @Prop(TypeMarkup(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: string
}

export function createModel (builder: Builder): void {
  const archiveId = 'archive'

  builder.createModel(TFunnel, TLead, TCustomer)

  builder.mixin(lead.class.Funnel, core.class.Class, workbench.mixin.SpaceView, {
    view: {
      class: lead.class.Lead,
      createItemDialog: lead.component.CreateLead,
      createItemLabel: lead.string.LeadCreateLabel
    }
  })

  builder.mixin(lead.class.Funnel, core.class.Class, view.mixin.ObjectEditor, {
    editor: lead.component.EditFunnel
  })

  builder.mixin(lead.class.Lead, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: lead.string.LeadApplication,
      icon: lead.icon.LeadApplication,
      alias: leadId,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'spaceBrowser',
            component: workbench.component.SpaceBrowser,
            icon: lead.icon.FunnelBrowser,
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
            component: workbench.component.SpecialView,
            componentProps: {
              _class: lead.mixin.Customer,
              icon: lead.icon.Lead,
              label: lead.string.Customers
            },
            position: 'top'
          },
          {
            id: archiveId,
            component: workbench.component.Archive,
            icon: view.icon.Archive,
            label: workbench.string.Archive,
            position: 'bottom',
            visibleIf: workbench.function.HasArchiveSpaces,
            spaceClass: lead.class.Funnel
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

  createAction(builder, { ...actionTemplates.archiveSpace, target: lead.class.Funnel })
  createAction(builder, { ...actionTemplates.unarchiveSpace, target: lead.class.Funnel })

  createAction(builder, {
    ...viewTemplates.open,
    target: lead.class.Funnel,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    },
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'space'
    }
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: lead.mixin.Customer,
      descriptor: view.viewlet.Table,
      config: [
        '',
        '_class',
        'leads',
        'modifiedOn',
        {
          key: '$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.channels.lastMessage', 'channels']
        }
      ],
      hiddenKeys: ['name']
    },
    lead.viewlet.TableCustomer
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: lead.class.Lead,
      descriptor: task.viewlet.StatusTable,
      config: [
        '',
        'title',
        'attachedTo',
        'state',
        'doneState',
        'attachments',
        'comments',
        'modifiedOn',
        {
          key: '$lookup.attachedTo.$lookup.channels',
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels']
        }
      ]
    },
    lead.viewlet.TableLead
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: lead.class.Lead,
      descriptor: view.viewlet.List,
      config: [
        { key: '', props: { listProps: { fixed: 'left' } } },
        { key: 'title', props: { listProps: { fixed: 'left' } } },
        { key: 'state', props: { listProps: { fixed: 'left' } } },
        { key: 'doneState', props: { listProps: { fixed: 'left' } } },
        { key: '', presenter: view.component.GrowPresenter },
        'attachments',
        'comments',
        'assignee'
      ],
      viewOptions: {
        groupBy: ['assignee', 'state', 'attachedTo'],
        orderBy: [
          ['assignee', -1],
          ['state', 1],
          ['attachedTo', 1],
          ['modifiedOn', -1]
        ],
        other: []
      }
    },
    lead.viewlet.ListLead
  )
  const leadViewOptions: ViewOptionsModel = {
    groupBy: ['state', 'assignee'],
    orderBy: [
      ['state', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['dueDate', SortingOrder.Ascending],
      ['rank', SortingOrder.Ascending]
    ],
    other: [
      {
        key: 'shouldShowAll',
        type: 'toggle',
        defaultValue: false,
        actionTarget: 'category',
        action: view.function.ShowEmptyGroups,
        label: view.string.ShowEmptyGroups
      }
    ]
  }

  const lookupLeadOptions: FindOptions<Lead> = {
    lookup: {
      attachedTo: lead.mixin.Customer
    }
  }

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: lead.string.Lead,
      icon: lead.icon.Lead,
      objectClass: lead.class.Lead
    },
    lead.ids.LeadNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: task.string.AssignedToMe,
      group: lead.ids.LeadNotificationGroup,
      field: 'assignee',
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: lead.class.Lead,
      templates: {
        textTemplate: '{doc} was assigned to you by {sender}',
        htmlTemplate: '<p>{doc} was assigned to you by {sender}</p>',
        subjectTemplate: '{doc} was assigned to you'
      },
      providers: {
        [notification.providers.PlatformNotification]: true,
        [notification.providers.EmailNotification]: true
      }
    },
    lead.ids.AssigneeNotification
  )

  generateClassNotificationTypes(
    builder,
    lead.class.Lead,
    lead.ids.LeadNotificationGroup,
    [],
    ['comments', 'state', 'doneState']
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: lead.class.Lead,
      descriptor: task.viewlet.Kanban,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      viewOptions: {
        ...leadViewOptions,
        groupDepth: 1
      },
      options: lookupLeadOptions,
      config: []
    },
    lead.viewlet.KanbanLead
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: lead.class.Lead,
      descriptor: task.viewlet.Dashboard,
      options: {},
      config: []
    },
    lead.viewlet.DashboardLead
  )

  builder.mixin(lead.class.Lead, core.class.Class, task.mixin.KanbanCard, {
    card: lead.component.KanbanCard
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ObjectEditor, {
    editor: lead.component.EditLead
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: lead.component.LeadPresenter
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: lead.component.LeadsPresenter
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.CollectionEditor, {
    editor: lead.component.Leads
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: lead.function.LeadTitleProvider
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ClassFilters, {
    filters: ['attachedTo']
  })

  builder.mixin(lead.mixin.Customer, core.class.Class, view.mixin.ClassFilters, {
    filters: ['_class']
  })

  createAction(builder, {
    action: workbench.actionImpl.Navigate,
    actionProps: {
      mode: 'app',
      application: leadId
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

  builder.createDoc(
    view.class.ActionCategory,
    core.space.Model,
    { label: lead.string.LeadApplication, visible: true },
    lead.category.Lead
  )

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: lead.component.CreateLead,
      _id: 'customer',
      element: 'top',
      props: {
        preserveCustomer: true
      },
      fillProps: {
        _id: 'customer'
      }
    },
    label: lead.string.CreateLead,
    icon: lead.icon.Lead,
    input: 'focus',
    category: lead.category.Lead,
    target: contact.class.Contact,
    context: {
      mode: ['context', 'browser'],
      group: 'associate'
    },
    override: [lead.action.CreateGlobalLead]
  })

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: lead.component.CreateLead,
        element: 'top'
      },
      label: lead.string.CreateLead,
      icon: lead.icon.Lead,
      keyBinding: [],
      input: 'none',
      category: lead.category.Lead,
      target: core.class.Doc,
      context: {
        mode: ['workbench', 'browser'],
        application: lead.app.Lead,
        group: 'create'
      }
    },
    lead.action.CreateGlobalLead
  )
}

export { leadOperation } from './migration'
export { default } from './plugin'
