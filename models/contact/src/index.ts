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

import {
  AvatarProvider,
  AvatarType,
  Channel,
  ChannelProvider,
  Contact,
  contactId,
  Employee,
  EmployeeAccount,
  GetAvatarUrl,
  Member,
  Organization,
  Organizations,
  Person,
  Persons,
  Status
} from '@hcengineering/contact'
import type { Class, Domain, Ref, Timestamp } from '@hcengineering/core'
import { DOMAIN_MODEL, IndexKind } from '@hcengineering/core'
import {
  Builder,
  Collection,
  Hidden,
  Index,
  Model,
  Prop,
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
import view, { actionTemplates, createAction, ViewAction, Viewlet } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import type { Asset, IntlString, Resource } from '@hcengineering/platform'
import setting from '@hcengineering/setting'
import contact from './plugin'

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
@UX(contact.string.Contact, contact.icon.Person, undefined, 'name')
export class TContact extends TDoc implements Contact {
  @Prop(TypeString(), contact.string.Name)
  @Index(IndexKind.FullText)
  @Hidden()
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
    provider!: Ref<ChannelProvider>

  @Prop(TypeString(), contact.string.Value)
  @Index(IndexKind.FullText)
    value!: string

  items?: number

  @Prop(TypeTimestamp(), core.string.Modified)
    lastMessage?: Timestamp
}

@Model(contact.class.Person, contact.class.Contact)
@UX(contact.string.Person, contact.icon.Person, undefined, 'name')
export class TPerson extends TContact implements Person {
  @Prop(TypeDate(false, false), contact.string.Birthday)
    birthday?: Timestamp
}

@Model(contact.class.Member, core.class.AttachedDoc, DOMAIN_CONTACT)
@UX(contact.string.Member, contact.icon.Person, undefined, 'name')
export class TMember extends TAttachedDoc implements Member {
  @Prop(TypeRef(contact.class.Contact), contact.string.Contact)
    contact!: Ref<Contact>
}

@Model(contact.class.Organization, contact.class.Contact)
@UX(contact.string.Organization, contact.icon.Company, undefined, 'name')
export class TOrganization extends TContact implements Organization {
  @Prop(Collection(contact.class.Member), contact.string.Members)
    members!: number
}

@Model(contact.class.Status, core.class.AttachedDoc, DOMAIN_CONTACT)
@UX(contact.string.Status)
export class TStatus extends TAttachedDoc implements Status {
  attachedTo!: Ref<Employee>
  attachedToClass!: Ref<Class<Employee>>
  name!: string
  dueDate!: Timestamp
}

@Model(contact.class.Employee, contact.class.Person)
@UX(contact.string.Employee, contact.icon.Person, undefined, 'name')
export class TEmployee extends TPerson implements Employee {
  active!: boolean

  @Prop(Collection(contact.class.Status), contact.string.Status)
    statuses?: number
}

@Model(contact.class.EmployeeAccount, core.class.Account)
export class TEmployeeAccount extends TAccount implements EmployeeAccount {
  employee!: Ref<Employee>
  name!: string
}

@Model(contact.class.Organizations, core.class.Space)
@UX(contact.string.OrganizationsFolder, contact.icon.Company)
export class TOrganizations extends TSpace implements Organizations {}

@Model(contact.class.Persons, core.class.Space)
@UX(contact.string.PersonsFolder, contact.icon.Person)
export class TPersons extends TSpace implements Persons {}

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
    TEmployeeAccount,
    TChannel,
    TStatus,
    TMember
  )

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.ObjectFactory, {
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
      component: contact.component.Contacts
    },
    contact.app.Contacts
  )

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
      hiddenKeys: ['name', 'contact']
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
      attachTo: contact.class.Contact,
      descriptor: view.viewlet.Table,
      config: [
        '',
        '_class',
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
      hiddenKeys: ['name']
    },
    contact.viewlet.TableContact
  )

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.ObjectEditor, {
    editor: contact.component.EditPerson,
    pinned: true
  })

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.ObjectEditor, {
    editor: contact.component.EditPerson,
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

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.EmployeeArrayEditor
  })

  builder.mixin(contact.class.Member, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.MemberPresenter
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: contact.component.PersonEditor
  })

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: contact.component.EmployeeEditor
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.ChannelsPresenter
  })

  builder.mixin(contact.class.Channel, core.class.Class, view.mixin.CollectionPresenter, {
    presenter: contact.component.ChannelsPresenter
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

  builder.mixin(contact.class.EmployeeAccount, core.class.Class, view.mixin.ArrayEditor, {
    inlineEditor: contact.component.AccountArrayEditor
  })

  builder.mixin(core.class.Account, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.EmployeeAccountPresenter
  })

  builder.mixin(contact.class.Organization, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.OrganizationPresenter
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.ContactPresenter
  })

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: contact.component.EmployeePresenter
  })

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.SortFuncs, {
    func: contact.function.EmployeeSort
  })

  builder.mixin(contact.class.Person, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.PersonRefPresenter
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.ContactRefPresenter
  })

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.AttributePresenter, {
    presenter: contact.component.EmployeeRefPresenter
  })

  builder.mixin(contact.class.Employee, core.class.Class, view.mixin.IgnoreActions, {
    actions: [view.action.Delete]
  })

  builder.mixin(contact.class.Contact, core.class.Class, view.mixin.ClassFilters, {
    filters: ['_class', 'city', 'modifiedOn']
  })

  builder.mixin(contact.class.Contact, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(contact.class.Member, core.class.Class, setting.mixin.Editable, {
    value: true
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
      icon: contact.icon.Person,
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

  createAction(builder, {
    ...actionTemplates.open,
    target: contact.class.Contact,
    context: {
      mode: ['browser', 'context'],
      group: 'create'
    }
  })

  createAction(
    builder,
    {
      action: contact.actionImpl.KickEmployee,
      label: contact.string.KickEmployee,
      query: {
        active: true
      },
      category: contact.category.Contact,
      target: contact.class.Employee,
      input: 'focus',
      context: {
        mode: ['context'],
        group: 'other'
      },
      secured: true
    },
    contact.action.KickEmployee
  )

  // Allow to use fuzzy search for mixins
  builder.mixin(contact.class.Contact, core.class.Class, core.mixin.FullTextSearchContext, {
    fullTextSummary: true
  })
}

export { contactOperation } from './migration'
export { contact as default }
