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

import { Employee } from '@anticrm/contact'
import { Arr, Class, Domain, IndexKind, Markup, Ref, Timestamp } from '@anticrm/core'
import type { Department, DepartmentMember, Request, Staff } from '@anticrm/hr'
import {
  ArrOf,
  Builder,
  Collection,
  Index,
  Mixin,
  Model,
  Prop,
  TypeDate,
  TypeMarkup,
  TypeRef,
  TypeString,
  UX
} from '@anticrm/model'
import attachment from '@anticrm/model-attachment'
import calendar from '@anticrm/model-calendar'
import chunter from '@anticrm/model-chunter'
import contact, { TEmployee, TEmployeeAccount } from '@anticrm/model-contact'
import core, { TAttachedDoc, TSpace } from '@anticrm/model-core'
import view, { createAction } from '@anticrm/model-view'
import workbench from '@anticrm/model-workbench'
import hr from './plugin'

export const DOMAIN_HR = 'hr' as Domain

@Model(hr.class.Department, core.class.Space)
@UX(hr.string.Department, hr.icon.Department)
export class TDepartment extends TSpace implements Department {
  @Prop(TypeRef(hr.class.Department), hr.string.ParentDepartmentLabel)
  declare space: Ref<Department>

  @Prop(TypeString(), core.string.Name)
  @Index(IndexKind.FullText)
  name!: string

  @Prop(Collection(contact.class.Channel), contact.string.ContactInfo)
  channels?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, undefined, attachment.string.Files)
  attachments?: number

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  avatar?: string | null

  @Prop(TypeRef(contact.class.Employee), hr.string.TeamLead)
  teamLead!: Ref<Employee> | null

  @Prop(ArrOf(TypeRef(hr.class.DepartmentMember)), contact.string.Members)
  declare members: Arr<Ref<DepartmentMember>>
}

@Model(hr.class.DepartmentMember, contact.class.EmployeeAccount)
@UX(contact.string.Employee, hr.icon.HR)
export class TDepartmentMember extends TEmployeeAccount implements DepartmentMember {}

@Mixin(hr.mixin.Staff, contact.class.Employee)
@UX(contact.string.Employee, hr.icon.HR)
export class TStaff extends TEmployee implements Staff {
  @Prop(TypeRef(hr.class.Department), hr.string.Department)
  department!: Ref<Department>
}

@Model(hr.class.Request, core.class.AttachedDoc, DOMAIN_HR)
export class TRequest extends TAttachedDoc implements Request {
  @Prop(TypeRef(hr.mixin.Staff), contact.string.Employee)
  declare attachedTo: Ref<Staff>

  declare attachedToClass: Ref<Class<Staff>>

  @Prop(TypeRef(hr.class.Department), hr.string.Department)
  declare space: Ref<Department>

  @Prop(Collection(chunter.class.Comment), chunter.string.Comments)
  comments?: number

  @Prop(Collection(attachment.class.Attachment), attachment.string.Attachments, undefined, attachment.string.Files)
  attachments?: number

  @Prop(TypeMarkup(), core.string.Description)
  @Index(IndexKind.FullText)
  description!: Markup

  @Prop(TypeDate(false), calendar.string.Date)
  date!: Timestamp

  @Prop(TypeDate(false), calendar.string.DueTo)
  dueDate!: Timestamp
}

@Model(hr.class.Leave, hr.class.Request)
export class TLeave extends TRequest {}

@Model(hr.class.Vacation, hr.class.Leave)
@UX(hr.string.Vacation, hr.icon.Vacation)
export class TVacation extends TLeave {}

@Model(hr.class.Sick, hr.class.Leave)
@UX(hr.string.Sick, hr.icon.Sick)
export class TSick extends TLeave {}

@Model(hr.class.PTO, hr.class.Leave)
@UX(hr.string.PTO, hr.icon.PTO)
export class TPTO extends TLeave {}

@Model(hr.class.PTO2, hr.class.PTO)
@UX(hr.string.PTO2, hr.icon.PTO)
export class TPTO2 extends TPTO {}

@Model(hr.class.Remote, hr.class.Request)
@UX(hr.string.Remote, hr.icon.Remote)
export class TRemote extends TRequest {}

@Model(hr.class.Overtime, hr.class.Request)
@UX(hr.string.Overtime, hr.icon.Overtime)
export class TOvertime extends TRequest {}

@Model(hr.class.Overtime2, hr.class.Overtime)
@UX(hr.string.Overtime2, hr.icon.Overtime)
export class TOvertime2 extends TRequest {}

export function createModel (builder: Builder): void {
  builder.createModel(
    TDepartment,
    TDepartmentMember,
    TRequest,
    TLeave,
    TVacation,
    TSick,
    TPTO,
    TPTO2,
    TRemote,
    TOvertime,
    TOvertime2,
    TStaff
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: hr.string.HRApplication,
      icon: hr.icon.HR,
      hidden: false,
      navigatorModel: {
        specials: [
          {
            id: 'structure',
            component: hr.component.Structure,
            icon: hr.icon.Structure,
            label: hr.string.Structure,
            position: 'top'
          },
          {
            id: 'schedule',
            component: hr.component.Schedule,
            icon: calendar.icon.Calendar,
            label: hr.string.Schedule,
            position: 'top'
          }
        ],
        spaces: []
      }
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
      context: { mode: 'context', application: hr.app.HR, group: 'top' }
    },
    hr.action.EditDepartment
  )

  createAction(
    builder,
    {
      action: view.actionImpl.Delete,
      label: view.string.Delete,
      icon: view.icon.Delete,
      input: 'any',
      category: hr.category.HR,
      keyBinding: ['Meta + Backspace', 'Ctrl + Backspace'],
      query: {
        'members.length': 0,
        _id: { $nin: [hr.ids.Head] }
      },
      target: hr.class.Department,
      context: { mode: 'context', application: hr.app.HR, group: 'top' }
    },
    hr.action.DeleteDepartment
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
      context: { mode: 'context', application: hr.app.HR, group: 'top' }
    },
    hr.action.EditRequest
  )
}

export { hrOperation } from './migration'
export { default } from './plugin'
