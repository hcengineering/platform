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
  AvatarType,
  contactId,
  type AvatarProvider,
  type SocialIdentity,
  type Channel,
  type ChannelProvider,
  type Contact,
  type ContactsTab,
  type Employee,
  type GetAvatarUrl,
  type Member,
  type Organization,
  type Person,
  type Status,
  type PersonSpace
} from '@hcengineering/contact'
import {
  AccountRole,
  DOMAIN_MODEL,
  DateRangeMode,
  IndexKind,
  type Collection,
  type Blob,
  type Class,
  type MarkupBlobRef,
  type Domain,
  type Ref,
  type Timestamp,
  type SocialIdType,
  type PersonUuid,
  type PersonId
} from '@hcengineering/core'
import {
  Collection as CollectionType,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  ReadOnly,
  TypeBlob,
  TypeBoolean,
  TypeCollaborativeDoc,
  TypeDate,
  TypePersonId,
  TypeRecord,
  TypeRef,
  TypeString,
  TypeTimestamp,
  UX,
  type Builder
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import chunter from '@hcengineering/model-chunter'
import core, { TAttachedDoc, TDoc, TSpace } from '@hcengineering/model-core'
import { createPublicLinkAction } from '@hcengineering/model-guest'
import { generateClassNotificationTypes } from '@hcengineering/model-notification'
import presentation from '@hcengineering/model-presentation'
import view, { createAction, createAttributePresenter, type Viewlet } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import { getEmbeddedLabel, type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import templates from '@hcengineering/templates'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { type Action } from '@hcengineering/view'
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
  action?: Ref<Action>
  placeholder!: IntlString
}

@Model(contact.class.Contact, core.class.Doc, DOMAIN_CONTACT)
@UX(contact.string.Contact, contact.icon.Person, 'CONT', 'name', undefined, contact.string.Persons)
export class TContact extends TDoc implements Contact {
  @Prop(TypeString(), contact.string.Name)
  @Index(IndexKind.FullText)
    name!: string

  @Prop(TypeString(), contact.string.Avatar)
  @Index(IndexKind.FullText)
  @Hidden()
    avatarType!: AvatarType

  @Prop(TypeBlob(), contact.string.Avatar)
  @Index(IndexKind.FullText)
  @Hidden()
    avatar!: Ref<Blob> | null | undefined

  @Prop(TypeRecord(), contact.string.Avatar)
  @Index(IndexKind.FullText)
  @Hidden()
    avatarProps?: {
    color?: string
    url?: string
  }

  @Prop(CollectionType(contact.class.Channel), contact.string.ContactInfo)
    channels?: number

  @Prop(CollectionType(attachment.class.Attachment), attachment.string.Attachments, {
    shortLabel: attachment.string.Files
  })
    attachments?: number

  @Prop(CollectionType(chunter.class.ChatMessage), chunter.string.Comments)
    comments?: number

  @Prop(TypeString(), contact.string.Location)
  @Index(IndexKind.FullText)
    city?: string
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

@Model(contact.class.SocialIdentity, core.class.AttachedDoc, DOMAIN_CHANNEL)
@UX(contact.string.SocialId)
export class TSocialIdentity extends TAttachedDoc implements SocialIdentity {
  declare attachedTo: Ref<Person>
  declare attachedToClass: Ref<Class<Person>>

  @Prop(TypePersonId(), getEmbeddedLabel('Key'))
  @Hidden()
    key!: PersonId

  @Prop(TypeString(), contact.string.Type)
    type!: SocialIdType

  @Prop(TypeString(), contact.string.Value)
  @Index(IndexKind.FullText)
    value!: string

  @Prop(TypeBoolean(), contact.string.Confirmed)
  @ReadOnly()
    confirmed!: boolean
}

@Model(contact.class.Person, contact.class.Contact)
@UX(contact.string.Person, contact.icon.Person, 'PRSN', 'name', undefined, contact.string.Persons)
export class TPerson extends TContact implements Person {
  @Prop(TypeString(), getEmbeddedLabel('UUID'))
  @Hidden()
    personUuid?: PersonUuid

  @Prop(TypeDate(DateRangeMode.DATE, false), contact.string.Birthday)
    birthday?: Timestamp

  @Prop(CollectionType(contact.class.SocialIdentity), contact.string.SocialIds)
    socialIds?: Collection<SocialIdentity>
}

@Model(contact.class.Member, core.class.AttachedDoc, DOMAIN_CONTACT)
@UX(contact.string.Member, contact.icon.Person, undefined, 'name')
export class TMember extends TAttachedDoc implements Member {
  @Prop(TypeRef(contact.class.Contact), contact.string.Contact)
    contact!: Ref<Contact>
}

@Model(contact.class.Organization, contact.class.Contact)
@UX(contact.string.Organization, contact.icon.Company, 'ORG', 'name', undefined, contact.string.Organizations)
export class TOrganization extends TContact implements Organization {
  @Prop(TypeCollaborativeDoc(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: MarkupBlobRef | null

  @Prop(CollectionType(contact.class.Member), contact.string.Members)
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

  @Prop(TypeString(), contact.string.Role)
  @ReadOnly()
  @Hidden()
    role?: 'USER' | 'GUEST'

  @Prop(CollectionType(contact.class.Status), contact.string.Status)
  @Hidden()
    statuses?: number

  @Prop(TypeString(), contact.string.Position)
  @Hidden()
    position?: string | null
}

@Model(contact.class.ContactsTab, core.class.Doc, DOMAIN_MODEL)
export class TContactsTab extends TDoc implements ContactsTab {
  label!: IntlString
  component!: AnyComponent
  index!: number
}

@Model(contact.class.PersonSpace, core.class.Space)
export class TPersonSpace extends TSpace implements PersonSpace {
  @Prop(TypeRef(contact.class.Person), contact.string.Person)
  @Index(IndexKind.Indexed)
    person!: Ref<Person>
}

export function createModel (builder: Builder): void {
  builder.createModel(
    TAvatarProvider,
    TChannelProvider,
    TContact,
    TPerson,
    TSocialIdentity,
    TOrganization,
    TEmployee,
    TChannel,
    TStatus,
    TMember,
    TContactsTab,
    TPersonSpace
  )

  builder.mixin(contact.class.Contact, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(contact.class.Person, core.class.Class, activity.mixin.ActivityDoc, {
    preposition: contact.string.For
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, activity.mixin.ActivityDoc, {
    preposition: contact.string.For
  })

  builder.mixin(contact.class.Organization, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(contact.class.Channel, core.class.Class, activity.mixin.ActivityDoc, {})

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectIcon, {
    component: contact.component.PersonIcon
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: contact.class.Contact,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: contact.class.Person,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: contact.class.Organization,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.createDoc(activity.class.ActivityExtension, core.space.Model, {
    ofClass: contact.class.Member,
    components: { input: { component: chunter.component.ChatMessageInput } }
  })

  builder.mixin(contact.mixin.Employee, core.class.Class, view.mixin.ObjectFactory, {
    component: contact.component.CreateEmployee
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectFactory, {
    component: contact.component.CreatePerson
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ObjectFactory, {
    component: contact.component.CreateOrganization
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: contact.function.ContactTitleProvider
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectTooltip, {
    provider: contact.function.PersonTooltipProvider
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.ObjectIdentifier, {
    provider: contact.function.ChannelIdentifierProvider
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.ObjectTitle, {
    titleProvider: contact.function.ChannelTitleProvider
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.ObjectIcon, {
    component: contact.component.ChannelIcon
  })

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: contact.string.Contacts,
      icon: contact.icon.ContactApplication,
      alias: contactId,
      accessLevel: AccountRole.User,
      hidden: false,
      // component: contact.component.ContactsTabs,
      locationResolver: contact.resolver.Location,
      locationDataResolver: contact.resolver.LocationData,
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

  builder.createDoc(activity.class.DocUpdateMessageViewlet, core.space.Model, {
    objectClass: contact.class.Person,
    action: 'update',
    config: {
      name: {
        presenter: contact.activity.NameChangedActivityMessage
      }
    }
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
        { key: '', props: { showStatus: true } },
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

  // builder.mixin(core.class.Account, core.class.Class, view.mixin.Aggregation, {
  //   createAggregationManager: contact.aggregation.CreatePersonAggregationManager,
  //   setStoreFunc: contact.function.SetPersonStore,
  //   filterFunc: contact.function.PersonFilterFunction
  // })

  // builder.mixin(core.class.Account, core.class.Class, view.mixin.Groupping, {
  //   grouppingManager: contact.aggregation.GrouppingPersonManager
  // })

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

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.AttributeFilterPresenter, {
    presenter: contact.component.PersonFilterValuePresenter
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
      action: contact.action.OpenChannel
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
      action: contact.action.OpenChannel
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
      action: contact.action.OpenChannel
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
      action: contact.action.OpenChannel
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
      action: contact.action.OpenChannel
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
      action: contact.action.OpenChannel
    },
    contact.channelProvider.Profile
  )

  builder.createDoc(
    contact.class.ChannelProvider,
    core.space.Model,
    {
      label: contact.string.Viber,
      icon: contact.icon.Viber,
      placeholder: contact.string.ViberPlaceholder
    },
    contact.channelProvider.Viber
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

  builder.createDoc(
    contact.class.AvatarProvider,
    core.space.Model,
    {
      type: AvatarType.EXTERNAL,
      getUrl: contact.function.GetExternalUrl
    },
    contact.avatarProvider.Color
  )

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.PersonPresenter
  })

  builder.mixin(core.class.TypePersonId, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.AccountArrayEditor
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.OrganizationPresenter
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.ContactArrayEditor
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
    filters: [],
    ignoreKeys: ['avatar']
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

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ObjectPanel, {
    component: contact.component.EditOrganizationPanel
  })

  createAction(builder, {
    label: view.string.Open,
    icon: view.icon.Open,
    action: view.actionImpl.ShowPanel,
    actionProps: {
      component: contact.component.EditOrganizationPanel,
      element: 'content'
    },
    input: 'focus',
    category: contact.category.Contact,
    override: [view.action.Open],
    keyBinding: ['keyE'],
    target: contact.class.Organization,
    context: {
      mode: ['context', 'browser'],
      group: 'create'
    }
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
      title: contact.string.Employees,
      query: contact.completion.EmployeeQuery,
      context: ['search', 'mention'],
      classToSearch: contact.mixin.Employee,
      priority: 1000
    },
    contact.completion.EmployeeCategory
  )

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: contact.icon.Persona,
      label: contact.string.SearchPerson,
      title: contact.string.People,
      query: contact.completion.PersonQuery,
      context: ['search', 'spotlight'],
      classToSearch: contact.class.Person,
      priority: 900
    },
    contact.completion.PersonCategory
  )

  builder.createDoc(
    presentation.class.ObjectSearchCategory,
    core.space.Model,
    {
      icon: contact.icon.Company,
      label: contact.string.SearchOrganization,
      title: contact.string.Organizations,
      query: contact.completion.OrganizationQuery,
      context: ['search', 'mention', 'spotlight'],
      classToSearch: contact.class.Organization,
      priority: 800
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
      action: contact.actionImpl.ResendInvite,
      label: contact.string.ResendInvite,
      query: {},
      category: contact.category.Contact,
      target: contact.mixin.Employee,
      input: 'focus',
      context: {
        mode: ['context'],
        group: 'remove'
      },
      secured: true,
      visibilityTester: contact.function.CanResendInvitation
    },
    contact.action.ResendInvite
  )

  createAction(
    builder,
    {
      action: contact.actionImpl.OpenChannel,
      category: contact.category.Channel,
      label: contact.string.Channel,
      input: 'none',
      context: {
        mode: ['none']
      },
      target: contact.class.Channel
    },
    contact.action.OpenChannel
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
  builder.createDoc(core.class.FullTextSearchContext, core.space.Model, {
    toClass: contact.class.Contact,
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

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: contact.class.Person,
      label: chunter.string.LeftComment
    },
    contact.ids.PersonChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: contact.mixin.Employee,
      label: chunter.string.LeftComment
    },
    contact.ids.EmployeeChatMessageViewlet
  )

  builder.createDoc(
    chunter.class.ChatMessageViewlet,
    core.space.Model,
    {
      messageClass: chunter.class.ChatMessage,
      objectClass: contact.class.Organization,
      label: chunter.string.LeftComment
    },
    contact.ids.OrganizationChatMessageViewlet
  )

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

  createPublicLinkAction(builder, contact.class.Contact, contact.action.PublicLink)

  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_CHANNEL,
    disabled: [
      { attachedToClass: 1 },
      { provider: 1 },
      { space: 1 },
      { modifiedBy: 1 },
      { modifiedOn: 1 },
      { createdBy: 1 },
      { createdBy: -1 },
      { createdOn: -1 }
    ]
  })
  builder.createDoc(core.class.DomainIndexConfiguration, core.space.Model, {
    domain: DOMAIN_CONTACT,
    indexes: [
      {
        keys: {
          _class: 1,
          [contact.mixin.Employee + '.active']: 1
        }
      }
    ],
    disabled: [{ attachedToClass: 1 }, { modifiedBy: 1 }, { createdBy: 1 }, { createdOn: -1 }, { attachedTo: 1 }]
  })

  createAttributePresenter(builder, contact.component.SpaceMembersEditor, core.class.Space, 'members', 'array')
}
