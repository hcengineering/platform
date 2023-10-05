//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2023 Hardcore Engineering Inc.
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

import activity from '@hcengineering/activity'
import {
  AvatarProvider,
  AvatarType,
  Channel,
  ChannelProvider,
  Contact,
  ContactsTab,
  Employee,
  PersonAccount,
  GetAvatarUrl,
  Member,
  Organization,
  Organizations,
  Person,
  Persons,
  Status,
  contactId
} from '@hcengineering/contact'
import { Class, DOMAIN_MODEL, DateRangeMode, Domain, IndexKind, Ref, Timestamp } from '@hcengineering/core'
import {
  Builder,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeBoolean,
  TypeDate,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TAccount, TAttachedDoc, TDoc, TSpace } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import view, { ViewAction, Viewlet, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import notification from '@hcengineering/notification'
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import templates from '@hcengineering/templates'
import { AnyComponent } from '@hcengineering/ui'
import contact from './plugin'

export { contactId } from '@hcengineering/contact'
export { contactOperation } from './migration'
export { contact as default }

export const DOMAIN_CONTACT = 'contact' as Domain
export const DOMAIN_CHANNEL = 'channel' as Domain

@Model(contact.class.AvatarProvider, core.class.Doc, DOMAIN_MODEL)
export class TAvatarProvider extends TDoc implements AvatarProvider {
  type!: AvatarType
  getUrl!: Resource<GetAvatarUrl>
}

@Model(contact.class.ChannelProvider, core.class.Doc, DOMAIN_MODEL)
export class TChannelProvider extends TDoc implements ChannelProvider {
  label!: IntlString
  icon?: Asset
  action?: ViewAction
  placeholder!: IntlString
}

@Model(contact.class.Contact, core.class.Doc, DOMAIN_CONTACT)
@UX(contact.string.Contact, contact.icon.Person, 'CONT', 'name')
export class TContact extends TDoc implements Contact {
  @Prop(TypeString(), contact.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  avatar?: string | null

  @Prop(Collection(contact.class.Channel), contact.string.ContactInfo)
    channels?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(TypeString(), contact.string.Location)
  @Index(IndexKind.FullText)
    city!: string
}

@Model(contact.class.Channel, core.class.AttachedDoc, DOMAIN_CHANNEL)
@UX(contact.string.Channel, contact.icon.Person)
export class TChannel extends TAttachedDoc implements Channel {
  @Prop(TypeRef(contact.class.ChannelProvider), contact.string.ChannelProvider)
  @Index(IndexKind.Indexed)
    provider!: Ref<ChannelProvider>

  @Prop(TypeString(), contact.string.Value)
  @Index(IndexKind.FullText)
    value!: string

  items?: number

  @Prop(TypeTimestamp(), core.string.Modified)
    lastMessage?: Timestamp
}

@Model(contact.class.Person, contact.class.Contact)
@UX(contact.string.Person, contact.icon.Person, 'PRSN', 'name')
export class TPerson extends TContact implements Person {
  @Prop(TypeDate(DateRangeMode.DATE, false), contact.string.Birthday)
    birthday?: Timestamp
}

@Model(contact.class.Member, core.class.AttachedDoc, DOMAIN_CONTACT)
@UX(contact.string.Member, contact.icon.Person, undefined, 'name')
export class TMember extends TAttachedDoc implements Member {
  @Prop(TypeRef(contact.class.Contact), contact.string.Contact)
    contact!: Ref<Contact>
}

@Model(contact.class.Organization, contact.class.Contact)
@UX(contact.string.Organization, contact.icon.Company, 'ORG', 'name')
export class TOrganization extends TContact implements Organization {
  @Prop(Collection(contact.class.Member), contact.string.Members)
    members!: number
}

@Model(contact.class.Status, core.class.AttachedDoc, DOMAIN_CONTACT)
@UX(contact.string.Status)
export class TStatus extends TAttachedDoc implements Status {
  declare attachedTo: Ref<Employee>
  declare attachedToClass: Ref<Class<Employee>>
  name!: string
  dueDate!: Timestamp
}

@Mixin(contact.mixin.Employee, contact.class.Person)
@UX(contact.string.Employee, contact.icon.Person, 'EMP', 'name')
export class TEmployee extends TPerson implements Employee {
  @Prop(TypeBoolean(), contact.string.Active)
  @ReadOnly()
  @Hidden()
    active!: boolean

  @Prop(Collection(contact.class.Status), contact.string.Status)
  @Hidden()
    statuses?: number

  @Prop(TypeString(), contact.string.Position)
  @Hidden()
    position?: string | null
}

@Model(contact.class.PersonAccount, core.class.Account)
export class TPersonAccount extends TAccount implements PersonAccount {
  person!: Ref<Person>
}

@Model(contact.class.Organizations, core.class.Space)
@UX(contact.string.OrganizationsFolder, contact.icon.Company)
export class TOrganizations extends TSpace implements Organizations {}

@Model(contact.class.Persons, core.class.Space)
@UX(contact.string.PersonsFolder, contact.icon.Person)
export class TPersons extends TSpace implements Persons {}

@Model(contact.class.ContactsTab, core.class.Doc, DOMAIN_MODEL)
export class TContactsTab extends TDoc implements ContactsTab {
  label!: IntlString
  component!: AnyComponent
  index!: number
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TAvatarProvider,
    TChannelProvider,
    TContact,
    TPerson,
    TPersons,
    TOrganization,
    TOrganizations,
    TEmployee,
    TPersonAccount,
    TChannel,
    TStatus,
    TMember,
    TContactsTab
  )

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.ObjectFactory, {
    component: contact.component.CreateEmployee
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectFactory, {
    component: contact.component.CreatePerson
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ObjectFactory, {
    component: contact.component.CreateOrganization
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: contact.string.Contacts,
      icon: contact.icon.ContactApplication,
      alias: contactId,
      hidden: false,
      // component: contact.component.ContactsTabs,
      locationResolver: contact.resolver.Location,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: 'employees',
            component: workbench.component.SpecialView,
            icon: contact.icon.Person,
            label: contact.string.Employee,
            componentProps: {
              _class: contact.mixin.Employee,
              icon: contact.icon.Person,
              label: contact.string.Employee,
              createLabel: contact.string.CreateEmployee,
              createComponent: contact.component.CreateEmployee
            }
          },
          {
            id: 'persons',
            component: workbench.component.SpecialView,
            icon: contact.icon.Person,
            label: contact.string.Person,
            componentProps: {
              _class: contact.class.Person,
              baseQuery: {
                [contact.mixin.Employee]: { $exists: false }
              },
              icon: contact.icon.Person,
              label: contact.string.Person,
              createLabel: contact.string.CreatePerson,
              createComponent: contact.component.CreatePerson
            }
          },
          {
            id: 'companies',
            component: workbench.component.SpecialView,
            icon: contact.icon.Company,
            label: contact.string.Organization,
            componentProps: {
              _class: contact.class.Organization,
              icon: contact.icon.Company,
              label: contact.string.Organization,
              createLabel: contact.string.CreateOrganization,
              createComponent: contact.component.CreateOrganization
            }
          }
        ]
      }
    },
    contact.app.Contacts
  )

  builder.createDoc(contact.class.ContactsTab, core.space.Model, {
    component: contact.component.Contacts,
    label: contact.string.Contacts,
    index: 100
  })

  builder.createDoc(activity.class.TxViewlet, core.space.Model, {
    objectClass: contact.class.Person,
    icon: contact.icon.Person,
    txClass: core.class.TxUpdateDoc,
    labelComponent: contact.activity.TxNameChange,
    display: 'inline',
    match: { 'operations.name': { $exists: true } }
  })

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: contact.class.Member,
      descriptor: view.viewlet.Table,
      config: [
        '',
        {
          key: '$lookup.contact.$lookup.channels',
          label: contact.string.Channel,
          sortingKey: ['$lookup.contact.$lookup.channels.lastMessage', '$lookup.contact.channels']
        },
        'modifiedOn'
      ],
      configOptions: {
        hiddenKeys: ['name', 'contact'],
        sortable: true
      }
    },
    contact.viewlet.TableMember
  )

  builder.mixin(contact.class.Member, core.class.Class, view.mixin.ObjectEditor, {
    editor: contact.component.EditMember,
    pinned: true
  })

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: contact.class.Person,
      descriptor: view.viewlet.Table,
      config: [
        '',
        'city',
        'attachments',
        'modifiedOn',
        { key: '', presenter: view.component.RolePresenter, label: view.string.Role },
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
      baseQuery: {
        _class: {
          $in: [contact.class.Person],
          $nin: [contact.mixin.Employee]
        }
      }
    },
    contact.viewlet.TablePerson
  )
  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: contact.mixin.Employee,
      descriptor: view.viewlet.Table,
      config: [
        '',
        'city',
        'attachments',
        'modifiedOn',
        { key: '', presenter: view.component.RolePresenter, label: view.string.Role },
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
    contact.viewlet.TableEmployee
  )

  builder.createDoc<Viewlet>(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: contact.class.Organization,
      descriptor: view.viewlet.Table,
      config: [
        '',
        'city',
        'attachments',
        'modifiedOn',
        { key: '', presenter: view.component.RolePresenter, label: view.string.Role },
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
    contact.viewlet.TableOrganization
  )

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectEditor, {
    editor: contact.component.EditPerson,
    pinned: true
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.ObjectEditor, {
    editor: contact.component.EditEmployee,
    pinned: true
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ObjectEditor, {
    editor: contact.component.EditOrganization,
    pinned: true
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: contact.component.OrganizationEditor
  })

  builder.mixin(contact.class.Member, core.class.Class, view.mixin.CollectionEditor, {
    editor: contact.component.Members
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.EmployeeArrayEditor
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.ContactArrayEditor
  })

  builder.mixin(contact.class.Contact, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: []
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.ObjectPanel, {
    component: contact.component.ChannelPanel
  })

  builder.mixin(contact.class.Channel, core.class.Class, notification.mixin.ClassCollaborators, {
    fields: ['modifiedBy']
  })

  builder.mixin(contact.class.Channel, core.class.Class, notification.mixin.NotificationObjectPresenter, {
    presenter: contact.component.ActivityChannelPresenter
  })

  builder.mixin(contact.class.Member, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.MemberPresenter
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: contact.component.PersonEditor
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: contact.component.EmployeeEditor
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.ChannelsPresenter
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: contact.component.ChannelsPresenter
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.LinkProvider, {
    encode: contact.function.GetContactLink
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: contact.component.EmployeeFilterValuePresenter
  })

  builder.mixin(core.class.Account, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: contact.component.PersonAccountFilterValuePresenter
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.AttributeFilter, {
    component: contact.component.EmployeeFilter
  })

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Phone,
      icon: contact.icon.Phone,
      placeholder: contact.string.PhonePlaceholder
    },
    contact.channelProvider.Phone
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.LinkedIn,
      icon: contact.icon.LinkedIn,
      placeholder: contact.string.LinkedInPlaceholder,
      action: contact.actionImpl.OpenChannel
    },
    contact.channelProvider.LinkedIn
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Twitter,
      icon: contact.icon.Twitter,
      placeholder: contact.string.AtPlaceHolder,
      action: contact.actionImpl.OpenChannel
    },
    contact.channelProvider.Twitter
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.GitHub,
      icon: contact.icon.GitHub,
      placeholder: contact.string.AtPlaceHolder,
      action: contact.actionImpl.OpenChannel
    },
    contact.channelProvider.GitHub
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Facebook,
      icon: contact.icon.Facebook,
      placeholder: contact.string.FacebookPlaceholder,
      action: contact.actionImpl.OpenChannel
    },
    contact.channelProvider.Facebook
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Homepage,
      icon: contact.icon.Homepage,
      placeholder: contact.string.HomepagePlaceholder,
      action: contact.actionImpl.OpenChannel
    },
    contact.channelProvider.Homepage
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Whatsapp,
      icon: contact.icon.Whatsapp,
      placeholder: contact.string.WhatsappPlaceholder
    },
    contact.channelProvider.Whatsapp
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Skype,
      icon: contact.icon.Skype,
      placeholder: contact.string.SkypePlaceholder
    },
    contact.channelProvider.Skype
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Profile,
      icon: contact.icon.Profile,
      placeholder: contact.string.ProfilePlaceholder,
      action: contact.actionImpl.OpenChannel
    },
    contact.channelProvider.Profile
  )

  builder.createDoc(
    contact.class.AvatarProvider,
    core.space.Model,
    {
      type: AvatarType.COLOR,
      getUrl: contact.function.GetColorUrl
    },
    contact.avatarProvider.Color
  )

  builder.createDoc(
    contact.class.AvatarProvider,
    core.space.Model,
    {
      type: AvatarType.IMAGE,
      getUrl: contact.function.GetFileUrl
    },
    contact.avatarProvider.Image
  )

  builder.createDoc(
    contact.class.AvatarProvider,
    core.space.Model,
    {
      type: AvatarType.GRAVATAR,
      getUrl: contact.function.GetGravatarUrl
    },
    contact.avatarProvider.Gravatar
  )

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.PersonPresenter
  })

  builder.mixin(core.class.Account, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.AccountArrayEditor
  })

  builder.mixin(contact.class.PersonAccount, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.AccountArrayEditor
  })

  builder.mixin(core.class.Account, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.PersonAccountPresenter
  })
  builder.mixin(core.class.Account, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.PersonAccountRefPresenter
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.OrganizationPresenter
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.ContactPresenter
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.EmployeePresenter
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.SortFuncs, {
    func: contact.function.EmployeeSort
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.PersonRefPresenter
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.ContactRefPresenter
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.EmployeeRefPresenter
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })
  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })
  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ClassFilters, {
    filters: []
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.AttributeFilter, {
    component: contact.component.ChannelFilter
  })

  builder.mixin(contact.class.Contact, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(contact.class.Member, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: contact.function.ContactTitleProvider
  })

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: contact.icon.Person,
      label: contact.string.SearchEmployee,
      query: contact.completion.EmployeeQuery
    },
    contact.completion.EmployeeCategory
  )

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: contact.icon.Persona,
      label: contact.string.SearchPerson,
      query: contact.completion.PersonQuery
    },
    contact.completion.PersonCategory
  )

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: contact.icon.Company,
      label: contact.string.SearchOrganization,
      query: contact.completion.OrganizationQuery
    },
    contact.completion.OrganizationCategory
  )

  createAction(
    builder,
    {
      action: contact.actionImpl.KickEmployee,
      label: contact.string.KickEmployee,
      icon: contact.icon.KickUser,
      query: {
        active: true
      },
      category: contact.category.Contact,
      target: contact.mixin.Employee,
      input: 'focus',
      context: {
        mode: ['context'],
        group: 'remove'
      },
      secured: true
    },
    contact.action.KickEmployee
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: contact.component.MergePersons,
        element: 'top',
        fillProps: {
          _object: 'value'
        }
      },
      query: {},
      label: contact.string.MergePersons,
      category: contact.category.Contact,
      target: contact.class.Person,
      input: 'focus',
      context: {
        mode: ['context'],
        group: 'remove'
      },
      secured: true
    },
    contact.action.MergePersons
  )

  // Allow to use fuzzy search for mixins
  builder.mixin(contact.class.Contact, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true
  })

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: view.string.FilterIsEither,
      selectedLabel: view.string.FilterIsEitherPlural,
      result: contact.function.FilterChannelInResult
    },
    contact.filter.FilterChannelIn
  )

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: view.string.FilterIsNot,
      result: contact.function.FilterChannelNinResult
    },
    contact.filter.FilterChannelNin
  )

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: contact.string.HasMessagesIn,
      result: contact.function.FilterChannelHasMessagesResult
    },
    contact.filter.FilterChannelHasMessages
  )

  builder.createDoc(
    view.class.FilterMode,
    core.space.Model,
    {
      label: contact.string.HasNewMessagesIn,
      result: contact.function.FilterChannelHasNewMessagesResult
    },
    contact.filter.FilterChannelHasNewMessages
  )

  builder.createDoc(
    templates.class.TemplateFieldCategory,
    core.space.Model,
    {
      label: contact.string.CurrentEmployee
    },
    contact.templateFieldCategory.CurrentEmployee
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: contact.string.Name,
      category: contact.templateFieldCategory.CurrentEmployee,
      func: contact.function.GetCurrentEmployeeName
    },
    contact.templateField.CurrentEmployeeName
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: contact.string.Email,
      category: contact.templateFieldCategory.CurrentEmployee,
      func: contact.function.GetCurrentEmployeeEmail
    },
    contact.templateField.CurrentEmployeeEmail
  )

  builder.createDoc(
    templates.class.TemplateFieldCategory,
    core.space.Model,
    {
      label: contact.string.Contact
    },
    contact.templateFieldCategory.Contact
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: contact.string.Name,
      category: contact.templateFieldCategory.Contact,
      func: contact.function.GetContactName
    },
    contact.templateField.ContactName
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: contact.string.Position,
      category: contact.templateFieldCategory.CurrentEmployee,
      func: contact.function.GetCurrentEmployeePosition
    },
    contact.templateField.CurrentEmployeePosition
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: contact.string.PersonFirstNamePlaceholder,
      category: contact.templateFieldCategory.Contact,
      func: contact.function.GetContactFirstName
    },
    contact.templateField.ContactFirstName
  )

  builder.createDoc(
    templates.class.TemplateField,
    core.space.Model,
    {
      label: contact.string.PersonLastNamePlaceholder,
      category: contact.templateFieldCategory.Contact,
      func: contact.function.GetContactLastName
    },
    contact.templateField.ContactLastName
  )

  builder.mixin(contact.class.Contact, core.class.Class, activity.mixin.ExtraActivityComponent, {
    component: contact.component.ActivityChannelMessage
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: contact.string.Organizations,
      icon: contact.icon.Company,
      objectClass: contact.class.Organization
    },
    contact.ids.OrganizationNotificationGroup
  )

  generateClassNotificationTypes(
    builder,
    contact.class.Organization,
    contact.ids.OrganizationNotificationGroup,
    [],
    ['comments', 'attachments', 'members']
  )

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: contact.string.Persons,
      icon: contact.icon.Person,
      objectClass: contact.class.Person
    },
    contact.ids.PersonNotificationGroup
  )

  generateClassNotificationTypes(
    builder,
    contact.class.Person,
    contact.ids.PersonNotificationGroup,
    [],
    ['comments', 'attachments']
  )
}
