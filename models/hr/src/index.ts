//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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

import { Contact, Employee } from '@hcengineering/contact'
import { Arr, Class, DOMAIN_MODEL, Domain, IndexKind, Markup, Ref, Type } from '@hcengineering/core'
import {
  Department,
  DepartmentMember,
  PublicHoliday,
  Request,
  RequestType,
  Staff,
  TzDate,
  hrId
} from '@hcengineering/hr'
import {
  ArrOf,
  Builder,
  Collection,
  Hidden,
  Index,
  Mixin,
  Model,
  Prop,
  TypeIntlString,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import attachment from '@hcengineering/model-attachment'
import calendar from '@hcengineering/model-calendar'
import chunter from '@hcengineering/model-chunter'
import contact, { TEmployee, TPersonAccount } from '@hcengineering/model-contact'
import core, { TAttachedDoc, TDoc, TSpace, TType } from '@hcengineering/model-core'
import view, { classPresenter, createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import notification from '@hcengineering/notification'
import { Asset, IntlString } from '@hcengineering/platform'
import hr from './plugin'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'

export { hrId } from '@hcengineering/hr'
export { hrOperation } from './migration'
export { default } from './plugin'

export const DOMAIN_HR = 'hr' as Domain

@Model(hr.class.Department, core.class.Space)
@UX(hr.string.Department, hr.icon.Department)
export class TDepartment extends TSpace implements Department {
  @Prop(TypeRef(hr.class.Department), hr.string.ParentDepartmentLabel)
  @Index(IndexKind.Indexed)
  declare space: Ref<Department>

  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
  declare name: string

  @Prop(Collection(contact.class.Channel), contact.string.ContactInfo)
    channels?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  avatar?: string | null

  @Prop(TypeRef(contact.mixin.Employee), hr.string.TeamLead)
    teamLead!: Ref<Employee> | null

  @Prop(ArrOf(TypeRef(hr.class.DepartmentMember)), contact.string.Members)
  declare members: Arr<Ref<DepartmentMember>>

  @Prop(ArrOf(TypeRef(contact.class.Contact)), hr.string.Subscribers)
    subscribers?: Arr<Ref<Contact>>

  @Prop(ArrOf(TypeRef(contact.mixin.Employee)), hr.string.Managers)
    managers!: Arr<Ref<Employee>>
}

@Model(hr.class.DepartmentMember, contact.class.PersonAccount)
@UX(contact.string.Employee, hr.icon.HR)
export class TDepartmentMember extends TPersonAccount implements DepartmentMember {}

@Mixin(hr.mixin.Staff, contact.mixin.Employee)
@UX(hr.string.Staff, hr.icon.HR, 'STFF', 'name')
export class TStaff extends TEmployee implements Staff {
  @Prop(TypeRef(hr.class.Department), hr.string.Department)
    department!: Ref<Department>
}

@Model(hr.class.RequestType, core.class.Doc, DOMAIN_MODEL)
@UX(hr.string.RequestType)
export class TRequestType extends TDoc implements RequestType {
  @Prop(TypeIntlString(), core.string.Name)
    label!: IntlString

  icon!: Asset
  value!: number
  color!: number
}

@Model(hr.class.TzDate, core.class.Type)
@UX(core.string.Timestamp)
export class TTzDate extends TType {
  year!: number
  month!: number
  day!: number
  offset!: number
}

/**
 * @public
 */
export function TypeTzDate (): Type<TzDate> {
  return { _class: hr.class.TzDate, label: core.string.Timestamp }
}

@Model(hr.class.Request, core.class.AttachedDoc, DOMAIN_HR)
@UX(hr.string.Request, hr.icon.PTO)
export class TRequest extends TAttachedDoc implements Request {
  @Prop(TypeRef(hr.mixin.Staff), contact.string.Employee)
  @Index(IndexKind.Indexed)
  declare attachedTo: Ref<Staff>

  @Index(IndexKind.Indexed)
  declare attachedToClass: Ref<Class<Staff>>

  @Prop(TypeRef(hr.class.Department), hr.string.Department)
  @Index(IndexKind.Indexed)
  declare space: Ref<Department>

  @Prop(TypeRef(hr.class.RequestType), hr.string.RequestType)
  @Hidden()
    type!: Ref<RequestType>

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
    comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, { shortLabel: attachment.string.Files })
    attachments?: number

  @Prop(TypeMarkup(), core.string.Description)
  @Index(IndexKind.FullText)
    description!: Markup

  @Prop(TypeTzDate(), calendar.string.Date)
    tzDate!: TzDate

  @Prop(TypeTzDate(), calendar.string.DueTo)
    tzDueDate!: TzDate
}

@Model(hr.class.PublicHoliday, core.class.Doc, DOMAIN_HR)
export class TPublicHoliday extends TDoc implements PublicHoliday {
  title!: string
  description!: string
  date!: TzDate
  department!: Ref<Department>
}

export function createModel (builder: Builder): void {
  builder.createModel(TDepartment, TDepartmentMember, TRequest, TRequestType, TPublicHoliday, TStaff, TTzDate)

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: hr.string.HRApplication,
      icon: hr.icon.HR,
      alias: hrId,
      hidden: false,
      component: hr.component.Schedule
    },
    hr.app.HR
  )

  builder.mixin(hr.class.Department, core.class.Class, view.mixin.AttributeEditor, {
    inlineEditor: hr.component.DepartmentEditor
  })

  builder.mixin(hr.class.Department, core.class.Class, view.mixin.ObjectEditor, {
    editor: hr.component.EditDepartment
  })

  builder.mixin(hr.class.Request, core.class.Class, view.mixin.ObjectEditor, {
    editor: hr.component.EditRequest
  })

  builder.mixin(hr.class.DepartmentMember, core.class.Class, view.mixin.ArrayEditor, {
    editor: hr.component.DepartmentStaff
  })

  classPresenter(builder, hr.class.TzDate, hr.component.TzDatePresenter, hr.component.TzDateEditor)

  builder.createDoc(
    hr.class.RequestType,
    core.space.Model,
    {
      label: hr.string.Vacation,
      icon: hr.icon.Vacation,
      color: 2,
      value: -1
    },
    hr.ids.Vacation
  )

  builder.createDoc(
    hr.class.RequestType,
    core.space.Model,
    {
      label: hr.string.Sick,
      icon: hr.icon.Sick,
      color: PaletteColorIndexes.Turquoise,
      value: -1
    },
    hr.ids.Sick
  )

  builder.createDoc(
    hr.class.RequestType,
    core.space.Model,
    {
      label: hr.string.PTO,
      icon: hr.icon.PTO,
      color: PaletteColorIndexes.Firework,
      value: -1
    },
    hr.ids.PTO
  )

  builder.createDoc(
    hr.class.RequestType,
    core.space.Model,
    {
      label: hr.string.PTO2,
      icon: hr.icon.PTO,
      color: PaletteColorIndexes.Watermelon,
      value: -0.5
    },
    hr.ids.PTO2
  )

  builder.createDoc(
    hr.class.RequestType,
    core.space.Model,
    {
      label: hr.string.Overtime,
      icon: hr.icon.Overtime,
      color: PaletteColorIndexes.Waterway,
      value: 1
    },
    hr.ids.Overtime
  )

  builder.createDoc(
    hr.class.RequestType,
    core.space.Model,
    {
      label: hr.string.Overtime2,
      icon: hr.icon.Overtime,
      color: PaletteColorIndexes.Cerulean,
      value: 0.5
    },
    hr.ids.Overtime2
  )

  builder.createDoc(
    hr.class.RequestType,
    core.space.Model,
    {
      label: hr.string.Remote,
      icon: hr.icon.Remote,
      color: PaletteColorIndexes.Coin,
      value: 0
    },
    hr.ids.Remote
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPanel,
      actionProps: {},
      label: view.string.Open,
      icon: view.icon.Open,
      keyBinding: ['e'],
      input: 'any',
      category: hr.category.HR,
      target: hr.class.Department,
      context: { mode: 'context', application: hr.app.HR, group: 'create' }
    },
    hr.action.EditDepartment
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPopup,
      actionProps: {
        component: hr.component.CreateDepartment,
        element: 'top',
        fillProps: {
          _id: 'space'
        }
      },
      label: hr.string.CreateDepartment,
      icon: hr.icon.Department,
      input: 'focus',
      category: hr.category.HR,
      target: hr.class.Department,
      context: { mode: 'context', application: hr.app.HR, group: 'create' }
    },
    hr.action.CreateDepartment
  )

  createAction(
    builder,
    {
      action: view.actionImpl.Archive,
      label: view.string.Archive,
      icon: view.icon.Archive,
      input: 'any',
      category: hr.category.HR,
      keyBinding: ['Meta + Backspace'],
      query: {
        'members.length': 0,
        _id: { $nin: [hr.ids.Head] }
      },
      target: hr.class.Department,
      context: { mode: ['context', 'browser'], group: 'tools' },
      override: [view.action.Archive, view.action.Delete]
    },
    hr.action.ArchiveDepartment
  )

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPanel,
      actionProps: {},
      label: view.string.Open,
      icon: view.icon.Open,
      keyBinding: ['e'],
      input: 'any',
      category: hr.category.HR,
      target: hr.class.Request,
      context: { mode: 'context', application: hr.app.HR, group: 'create' },
      override: [view.action.Open]
    },
    hr.action.EditRequest
  )

  createAction(
    builder,
    {
      action: hr.actionImpl.EditRequestType,
      actionProps: {},
      label: hr.string.EditRequestType,
      icon: view.icon.Edit,
      input: 'any',
      category: hr.category.HR,
      target: hr.class.Request,
      context: { mode: 'context', application: hr.app.HR, group: 'edit' }
    },
    hr.action.EditRequestType
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: hr.mixin.Staff,
      descriptor: view.viewlet.Table,
      config: [
        '',
        {
          key: '$lookup.channels',
          label: contact.string.ContactInfo,
          sortingKey: ['$lookup.channels.lastMessage', 'channels']
        },
        'modifiedOn'
      ]
    },
    hr.viewlet.TableMember
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: hr.mixin.Staff,
      descriptor: view.viewlet.Table,
      config: ['']
    },
    hr.viewlet.StaffStats
  )

  createAction(builder, {
    action: view.actionImpl.ValueSelector,
    actionPopup: view.component.ValueSelector,
    actionProps: {
      attribute: 'department',
      _class: hr.class.Department,
      query: {},
      searchField: 'name',
      placeholder: hr.string.Department
    },
    label: hr.string.Department,
    icon: hr.icon.Department,
    keyBinding: [],
    input: 'none',
    category: hr.category.HR,
    target: hr.mixin.Staff,
    context: {
      mode: ['context'],
      application: hr.app.HR,
      group: 'associate'
    }
  })

  builder.mixin(hr.class.Request, core.class.Class, view.mixin.ObjectPresenter, {
    presenter: hr.component.RequestPresenter
  })

  builder.createDoc(
    notification.class.NotificationGroup,
    core.space.Model,
    {
      label: hr.string.HRApplication,
      icon: hr.icon.HR
    },
    hr.ids.HRNotificationGroup
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      label: hr.string.RequestCreated,
      group: hr.ids.HRNotificationGroup,
      // will be created with different trigger
      txClasses: [],
      objectClass: hr.class.Request,
      providers: {
        [notification.providers.EmailNotification]: true,
        [notification.providers.PlatformNotification]: true
      },
      templates: {
        textTemplate: 'New request: {doc}',
        htmlTemplate: 'New request: {doc}',
        subjectTemplate: 'New request'
      }
    },
    hr.ids.CreateRequestNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      group: hr.ids.HRNotificationGroup,
      label: hr.string.RequestUpdated,
      // will be created with different trigger
      txClasses: [],
      objectClass: hr.class.Request,
      providers: {
        [notification.providers.EmailNotification]: true,
        [notification.providers.PlatformNotification]: true
      },
      templates: {
        textTemplate: 'Request updated: {doc}',
        htmlTemplate: 'Request updated: {doc}',
        subjectTemplate: 'Request updated'
      }
    },
    hr.ids.UpdateRequestNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      group: hr.ids.HRNotificationGroup,
      generated: false,
      label: hr.string.RequestRemoved,
      // will be created with different trigger
      txClasses: [],
      objectClass: hr.class.Request,
      providers: {
        [notification.providers.EmailNotification]: true,
        [notification.providers.PlatformNotification]: true
      },
      templates: {
        textTemplate: 'Request removed: {doc}',
        htmlTemplate: 'Request removed: {doc}',
        subjectTemplate: 'Request removed'
      }
    },
    hr.ids.RemoveRequestNotification
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      group: hr.ids.HRNotificationGroup,
      label: hr.string.PublicHoliday,
      // will be created with different trigger
      txClasses: [],
      objectClass: hr.class.PublicHoliday,
      providers: {
        [notification.providers.EmailNotification]: true,
        [notification.providers.PlatformNotification]: true
      },
      templates: {
        textTemplate: 'New public holiday: {doc}',
        htmlTemplate: 'New public holiday: {doc}',
        subjectTemplate: 'New public holiday'
      }
    },
    hr.ids.CreatePublicHolidayNotification
  )
}
