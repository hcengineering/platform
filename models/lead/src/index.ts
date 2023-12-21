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
import { type FindOptions, IndexKind, type Ref, SortingOrder, type Status, type Timestamp } from '@hcengineering/core'
import { type Customer, type Funnel, type Lead, leadId } from '@hcengineering/lead'
import {
  type Builder,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeCollaborativeMarkup,
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
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import task, { TProject, TTask, actionTemplates } from '@hcengineering/model-task'
import tracker from '@hcengineering/model-tracker'
import view, { createAction, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import setting from '@hcengineering/setting'
import { type ViewOptionsModel } from '@hcengineering/view'
import activity from '@hcengineering/activity'

import lead from './plugin'

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
@UX(lead.string.Lead, lead.icon.Lead, undefined, 'title')
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
@UX(lead.string.Customer, lead.icon.LeadApplication)
export class TCustomer extends TContact implements Customer {
  @Prop(Collection(lead.class.Lead), lead.string.Leads)
    leads?: number

  @Prop(TypeCollaborativeMarkup(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: string
}

export function createModel (builder: Builder): void {
  const archiveId = 'archive'

  builder.createModel(TFunnel, TLead, TCustomer)

  builder.mixin(lead.class.Lead, core.class.Class, activity.mixin.ActivityDoc, {
    ignoreCollections: ['comments']
  })

  builder.mixin(lead.mixin.Customer, core.class.Class, activity.mixin.ActivityDoc, {
    ignoreCollections: ['comments']
  })

  builder.mixin(lead.class.Funnel, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: lead.class.Lead,
    components: { input: chunter.component.ChatMessageInput }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: lead.class.Funnel,
    components: { input: chunter.component.ChatMessageInput }
  })

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
            id: 'my-leads',
            label: lead.string.MyLeads,
            icon: lead.icon.Lead,
            component: lead.component.MyLeads,
            componentProps: {
              config: [
                ['assigned', view.string.Assigned, {}],
                ['created', view.string.Created, {}],
                ['subscribed', view.string.Subscribed, {}]
              ]
            },
            position: 'top'
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
            id: 'funnels',
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
    query: {
      archived: true
    },
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
        'attachments',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          props: {
            kind: 'link'
          },
          label: tracker.string.Relations
        },
        'comments',
        'modifiedOn',
        {
          key: '$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.channels.lastMessage', 'channels']
        }
      ],
      configOptions: {
        hiddenKeys: ['name'],
        sortable: true
      },
      options: {
        lookup: {
          _id: {
            related: [tracker.class.Issue, 'relations._id']
          }
        }
      }
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
        'assignee',
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          props: {
            kind: 'link'
          },
          label: tracker.string.Issues
        },
        'status',
        'attachments',
        'comments',
        'modifiedOn',
        {
          key: '$lookup.attachedTo.$lookup.channels',
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels']
        }
      ],
      configOptions: {
        sortable: true
      },
      options: {
        lookup: {
          _id: {
            related: [tracker.class.Issue, 'relations._id']
          }
        }
      }
    },
    lead.viewlet.TableLead
  )

  const leadViewOptions: ViewOptionsModel = {
    groupBy: ['status', 'assignee'],
    orderBy: [
      ['status', SortingOrder.Ascending],
      ['modifiedOn', SortingOrder.Descending],
      ['createdOn', SortingOrder.Descending],
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
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: lead.class.Lead,
      descriptor: view.viewlet.List,
      configOptions: {
        strict: true,
        hiddenKeys: ['title']
      },
      config: [
        { key: '', displayProps: { fixed: 'left', key: 'lead' } },
        {
          key: 'status',
          props: { kind: 'list', size: 'small', shouldShowName: false }
        },
        {
          key: '',
          presenter: lead.component.TitlePresenter,
          label: lead.string.Title,
          props: { maxWidth: '10rem' }
        },
        {
          key: '$lookup.attachedTo',
          presenter: contact.component.PersonPresenter,
          label: lead.string.Customer,
          sortingKey: '$lookup.attachedTo.name',
          props: {
            _class: lead.mixin.Customer,
            maxWidth: '10rem'
          }
        },
        {
          key: '',
          presenter: tracker.component.RelatedIssueSelector,
          label: tracker.string.Relations,
          props: { size: 'small' }
        },
        { key: 'attachments', displayProps: { key: 'attachments', suffix: true } },
        { key: 'comments', displayProps: { key: 'comments', suffix: true } },
        { key: '', displayProps: { grow: true } },
        {
          key: '$lookup.attachedTo.$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels'],
          props: {
            length: 'full',
            size: 'small',
            kind: 'list'
          },
          displayProps: { compression: true }
        },
        { key: 'modifiedOn', displayProps: { key: 'modified', fixed: 'right', dividerBefore: true } },
        {
          key: 'assignee',
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' },
          displayProps: { key: 'assignee', fixed: 'right' }
        }
      ],
      viewOptions: leadViewOptions
    },
    lead.viewlet.ListLead
  )

  const lookupLeadOptions: FindOptions<Lead> = {
    lookup: {
      attachedTo: lead.mixin.Customer
    }
  }

  createAction(
    builder,
    {
      ...actionTemplates.editStatus,
      target: lead.class.Funnel,
      query: {
        archived: false
      },
      context: {
        mode: ['context', 'browser'],
        group: 'edit'
      },
      override: [task.action.EditStatuses]
    },
    lead.action.EditStatuses
  )

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

  generateClassNotificationTypes(builder, lead.class.Lead, lead.ids.LeadNotificationGroup, [], ['comments', 'status'])

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: lead.string.Customers,
      icon: lead.icon.CreateCustomer,
      objectClass: lead.mixin.Customer
    },
    lead.ids.CustomerNotificationGroup
  )

  generateClassNotificationTypes(
    builder,
    lead.mixin.Customer,
    lead.ids.CustomerNotificationGroup,
    [],
    ['comments', 'attachments']
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: lead.string.Funnels,
      icon: lead.icon.Funnel,
      objectClass: lead.class.Funnel
    },
    lead.ids.FunnelNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: lead.string.LeadCreateLabel,
      group: lead.ids.FunnelNotificationGroup,
      field: 'space',
      txClasses: [core.class.TxCreateDoc, core.class.TxUpdateDoc],
      objectClass: lead.class.Funnel,
      spaceSubscribe: true,
      providers: {
        [notification.providers.PlatformNotification]: false
      }
    },
    lead.ids.LeadCreateNotification
  )

  generateClassNotificationTypes(builder, lead.class.Funnel, lead.ids.FunnelNotificationGroup, [], ['comments'])

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
      config: ['attachedTo', 'attachments', 'comments', 'dueDate', 'assignee'],
      configOptions: {
        strict: true
      }
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

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      objectClass: lead.class.Lead,
      label: chunter.string.LeftComment
    },
    lead.ids.LeadChatMessageViewlet
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

  builder.mixin(lead.class.Lead, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['createdBy', 'assignee']
  })

  builder.mixin(lead.mixin.Customer, core.class.Class, view.mixin.ClassFilters, {
    filters: ['_class']
  })

  builder.mixin(lead.mixin.Customer, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: tracker.component.RelatedIssuesSection,
    props: {
      label: tracker.string.RelatedIssues
    }
  })

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ObjectEditorFooter, {
    editor: tracker.component.RelatedIssuesSection,
    props: {
      label: tracker.string.RelatedIssues
    }
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

  createAction(builder, {
    action: view.actionImpl.ShowPopup,
    actionProps: {
      component: lead.component.CreateFunnel,
      _id: 'customer',
      element: 'top',
      fillProps: {
        _object: 'funnel'
      }
    },
    label: lead.string.EditFunnel,
    icon: lead.icon.Funnel,
    input: 'focus',
    category: lead.category.Lead,
    target: lead.class.Funnel,
    override: [view.action.Open],
    context: {
      mode: ['context', 'browser'],
      group: 'associate'
    }
  })

  builder.createDoc(
    task.class.ProjectTypeDescriptor,
    core.space.Model,
    {
      name: lead.string.LeadApplication,
      description: lead.string.ManageFunnelStatuses,
      icon: lead.component.TemplatesIcon,
      baseClass: lead.class.Funnel
    },
    lead.descriptors.FunnelType
  )
  builder.createDoc(
    task.class.TaskTypeDescriptor,
    core.space.Model,
    {
      baseClass: lead.class.Lead,
      allowCreate: true,
      description: lead.string.Lead,
      icon: lead.icon.Lead,
      name: lead.string.Lead
    },
    lead.descriptors.Lead
  )
}
