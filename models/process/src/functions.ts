// Copyright © 2025 Hardcore Engineering Inc.
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

import contact from '@hcengineering/contact'
import core from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import process from './plugin'

export function defineFunctions (builder: Builder): void {
  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.UpperCase,
      type: 'transform'
    },
    process.function.UpperCase
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.LowerCase,
      type: 'transform'
    },
    process.function.LowerCase
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Trim,
      type: 'transform'
    },
    process.function.Trim
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Prepend,
      allowMany: true,
      type: 'transform',
      editor: process.transformEditor.AppendEditor
    },
    process.function.Prepend
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Append,
      allowMany: true,
      type: 'transform',
      editor: process.transformEditor.AppendEditor
    },
    process.function.Append
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Replace,
      allowMany: true,
      type: 'transform',
      editor: process.transformEditor.ReplaceEditor
    },
    process.function.Replace
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.ReplaceAll,
      allowMany: true,
      type: 'transform',
      editor: process.transformEditor.ReplaceEditor
    },
    process.function.ReplaceAll
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Split,
      allowMany: true,
      type: 'transform',
      editor: process.transformEditor.SplitEditor
    },
    process.function.Split
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Cut,
      allowMany: true,
      editor: process.transformEditor.CutEditor,
      type: 'transform'
    },
    process.function.Cut
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: undefined,
      label: process.string.FirstValue,
      type: 'reduce'
    },
    process.function.FirstValue
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      type: 'reduce',
      category: undefined,
      label: process.string.LastValue
    },
    process.function.LastValue
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      type: 'reduce',
      category: undefined,
      label: process.string.Random
    },
    process.function.Random
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: 'array',
      label: process.string.Each,
      type: 'reduce'
    },
    process.function.All
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      type: 'transform',
      category: 'attribute',
      label: process.string.Add,
      presenter: process.transformPresenter.NumberPresenter,
      allowMany: true,
      editor: process.transformEditor.NumberEditor
    },
    process.function.Add
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Subtract,
      presenter: process.transformPresenter.NumberPresenter,
      allowMany: true,
      editor: process.transformEditor.NumberEditor,
      type: 'transform'
    },
    process.function.Subtract
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Multiply,
      presenter: process.transformPresenter.NumberPresenter,
      type: 'transform',
      allowMany: true,
      editor: process.transformEditor.NumberEditor
    },
    process.function.Multiply
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Divide,
      presenter: process.transformPresenter.NumberPresenter,
      type: 'transform',
      allowMany: true,
      editor: process.transformEditor.NumberEditor
    },
    process.function.Divide
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Modulo,
      presenter: process.transformPresenter.NumberPresenter,
      type: 'transform',
      allowMany: true,
      editor: process.transformEditor.NumberEditor
    },
    process.function.Modulo
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Power,
      presenter: process.transformPresenter.NumberPresenter,
      type: 'transform',
      allowMany: true,
      editor: process.transformEditor.NumberEditor
    },
    process.function.Power
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Sqrt,
      presenter: process.transformPresenter.NumberPresenter,
      type: 'transform',
      allowMany: true
    },
    process.function.Sqrt
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Round,
      type: 'transform',
      allowMany: true
    },
    process.function.Round
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Absolute,
      type: 'transform',
      allowMany: true
    },
    process.function.Absolute
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Ceil,
      type: 'transform',
      allowMany: true
    },
    process.function.Ceil
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Floor,
      type: 'transform',
      allowMany: true
    },
    process.function.Floor
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeDate,
      category: 'attribute',
      label: process.string.Offset,
      editor: process.transformEditor.DateOffsetEditor,
      type: 'transform'
    },
    process.function.Offset
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeDate,
      category: 'attribute',
      label: process.string.FirstWorkingDayAfter,
      type: 'transform'
    },
    process.function.FirstWorkingDayAfter
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: 'array',
      label: process.string.Insert,
      allowMany: true,
      editor: process.transformEditor.MultiArrayElementEditor,
      type: 'transform'
    },
    process.function.Insert
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: 'array',
      label: process.string.Remove,
      allowMany: true,
      editor: process.transformEditor.ArrayElementEditor,
      type: 'transform'
    },
    process.function.Remove
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: 'array',
      label: process.string.RemoveFirst,
      allowMany: true,
      type: 'transform'
    },
    process.function.RemoveFirst
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: 'array',
      label: process.string.RemoveLast,
      allowMany: true,
      type: 'transform'
    },
    process.function.RemoveLast
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: contact.mixin.Employee,
      editor: process.component.RoleEditor,
      presenter: process.transformPresenter.RolePresenter,
      category: 'array',
      label: core.string.Role,
      type: 'context'
    },
    process.function.RoleContext
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: 'array',
      label: process.string.EmptyArray,
      type: 'context'
    },
    process.function.EmptyArray
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: contact.mixin.Employee,
      category: 'attribute',
      label: process.string.ExecutionInitiator,
      type: 'context'
    },
    process.function.ExecutionEmployeeInitiator
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: contact.class.Person,
      category: 'attribute',
      label: process.string.ExecutionInitiator,
      type: 'context'
    },
    process.function.ExecutionInitiator
  )

    builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeDate,
      category: 'attribute',
      label: process.string.ExecutionStarted,
      type: 'context'
    },
    process.function.ExecutionStarted
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: contact.class.Person,
      category: 'attribute',
      label: process.string.CurrentUser,
      type: 'context'
    },
    process.function.CurrentUser
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: contact.mixin.Employee,
      category: 'attribute',
      label: process.string.CurrentUser,
      type: 'context'
    },
    process.function.CurrentEmployee
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeDate,
      category: 'attribute',
      label: process.string.CurrentDate,
      type: 'context'
    },
    process.function.CurrentDate
  )
}
