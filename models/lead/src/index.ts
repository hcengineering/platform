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
import activity from '@hcengineering/activity'
import { AccountRole, SortingOrder, type FindOptions } from '@hcengineering/core'
import { leadId, type Lead } from '@hcengineering/lead'
import { type Builder } from '@hcengineering/model'
import chunter from '@hcengineering/model-chunter'
import contact from '@hcengineering/model-contact'
import core from '@hcengineering/model-core'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import task, { actionTemplates } from '@hcengineering/model-task'
import tracker from '@hcengineering/model-tracker'
import view, { createAction, actionTemplates as viewTemplates } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import setting from '@hcengineering/setting'
import { type ViewOptionsModel } from '@hcengineering/view'

import lead from './plugin'
import { defineSpaceType } from './spaceType'
import { TCustomer, TFunnel, TLead } from './types'

export { leadId } from '@hcengineering/lead'
export { leadOperation } from './migration'
export { default } from './plugin'
export * from './spaceType'
export * from './types'

export function createModel (builder: Builder): void {
  builder.createModel(TFunnel, TLead, TCustomer)

  builder.mixin(lead.class.Lead, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(lead.mixin.Customer, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(lead.class.Funnel, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: lead.class.Lead,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: lead.class.Funnel,
    components: { input: { component: chunter.component.ChatMessageInput } }
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
            accessLevel: AccountRole.User,
            componentProps: {
              _class: lead.mixin.Customer,
              icon: contact.icon.Person,
              label: lead.string.Customers
            },
            position: 'top'
          },
          {
            id: 'funnels',
            component: workbench.component.SpecialView,
            icon: lead.icon.Funnels,
            label: lead.string.Funnels,
            position: 'bottom',
            accessLevel: AccountRole.User,
            componentProps: {
              _class: lead.class.Funnel,
              icon: lead.icon.Funnels,
              label: lead.string.Funnels,
              createComponent: lead.component.CreateFunnel,
              createLabel: lead.string.CreateFunnel
            }
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

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: lead.class.Funnel,
      descriptor: view.viewlet.Table,
      configOptions: {
        hiddenKeys: ['identifier', 'name', 'customerDescription'],
        sortable: true
      },
      viewOptions: {
        groupBy: [],
        orderBy: [],
        other: [
          {
            key: 'hideArchived',
            type: 'toggle',
            defaultValue: true,
            actionTarget: 'options',
            action: view.function.HideArchived,
            label: view.string.HideArchived
          }
        ]
      },
      config: ['', 'members', 'private', 'archived']
    },
    lead.viewlet.TableFunnel
  )

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
        'status',
        'attachments',
        'comments',
        {
          key: '',
          label: tracker.string.RelatedIssues,
          presenter: tracker.component.RelatedIssueSelector,
          displayProps: { key: 'related', suffix: true }
        },
        'modifiedOn',
        {
          key: '$lookup.attachedTo.$lookup.channels',
          sortingKey: ['$lookup.attachedTo.$lookup.channels.lastMessage', '$lookup.attachedTo.channels']
        }
      ],
      viewOptions: {
        groupBy: [],
        orderBy: [],
        other: [
          {
            key: 'hideArchived',
            type: 'toggle',
            defaultValue: true,
            actionTarget: 'options',
            action: view.function.HideArchived,
            label: view.string.HideArchived
          }
        ]
      },
      configOptions: {
        sortable: true
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
      },
      {
        key: 'hideArchived',
        type: 'toggle',
        defaultValue: true,
        actionTarget: 'options',
        action: view.function.HideArchived,
        label: view.string.HideArchived
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
        { key: 'attachments', displayProps: { key: 'attachments', suffix: true } },
        { key: 'comments', displayProps: { key: 'comments', suffix: true } },
        {
          key: '',
          label: tracker.string.RelatedIssues,
          presenter: tracker.component.RelatedIssueSelector,
          displayProps: { key: 'related', suffix: true }
        },
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
      defaultEnabled: true
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
      defaultEnabled: false,
      templates: {
        textTemplate: '{body}',
        htmlTemplate: '<p>{body}</p>',
        subjectTemplate: '{title}'
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
      config: ['attachedTo', 'status', 'attachments', 'comments', 'dueDate', 'assignee'],
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
      messageClass: chunter.class.ChatMessage,
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

  builder.mixin(lead.class.Lead, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: lead.function.LeadIdProvider
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
    visibilityTester: view.function.CanEditSpace,
    override: [view.action.Open],
    context: {
      mode: ['context', 'browser'],
      group: 'associate'
    }
  })

  defineSpaceType(builder)
}
