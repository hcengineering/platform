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
import contact, { TEmployee, TEmployeeAccount } from '@anticrm/model-contact'
import { Arr, IndexKind, Ref } from '@anticrm/core'
import type { Department, DepartmentMember, Staff } from '@anticrm/hr'
import { Builder, Index, Mixin, Model, Prop, TypeRef, Collection, TypeString, UX, ArrOf } from '@anticrm/model'
import core, { TSpace } from '@anticrm/model-core'
import workbench from '@anticrm/model-workbench'
import hr from './plugin'
import view, { createAction } from '@anticrm/model-view'
import attachment from '@anticrm/model-attachment'
import chunter from '@anticrm/model-chunter'

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

export function createModel (builder: Builder): void {
  builder.createModel(TDepartment, TDepartmentMember, TStaff)

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

  builder.mixin(hr.class.DepartmentMember, core.class.Class, view.mixin.ArrayEditor, {
    editor: hr.component.DepartmentStaff
  })

  createAction(
    builder,
    {
      action: view.actionImpl.ShowPanel,
      actionProps: {
        component: hr.component.EditDepartment
      },
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
}

export { hrOperation } from './migration'
export { default } from './plugin'
