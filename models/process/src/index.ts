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

import card, { type Tag, type Card, type MasterTag } from '@hcengineering/card'
import contact, { type Employee } from '@hcengineering/contact'
import core, {
  AccountRole,
  type Class,
  DOMAIN_MODEL,
  type Doc,
  type Domain,
  type Ref,
  SortingOrder,
  type Space,
  type Tx
} from '@hcengineering/core'
import {
  ArrOf,
  type Builder,
  Model,
  Prop,
  ReadOnly,
  TypeAny,
  TypeBoolean,
  TypeRecord,
  TypeRef,
  TypeString
} from '@hcengineering/model'
import { TDoc } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import { TToDo } from '@hcengineering/model-time'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { type IntlString } from '@hcengineering/platform'
import {
  type Execution,
  type ExecutionError,
  type Method,
  type Process,
  type ProcessFunction,
  type ProcessToDo,
  type State,
  type Step,
  processId
} from '@hcengineering/process'
import time from '@hcengineering/time'
import { type AnyComponent } from '@hcengineering/ui'
import { type AttributeCategory } from '@hcengineering/view'
import process from './plugin'

const DOMAIN_PROCESS = 'process' as Domain

@Model(process.class.Process, core.class.Doc, DOMAIN_MODEL)
export class TProcess extends TDoc implements Process {
  @Prop(TypeString(), core.string.Name)
    name!: string

  @Prop(TypeString(), core.string.Description)
    description!: string

  @Prop(TypeRef(card.class.MasterTag), card.string.MasterTag)
    masterTag!: Ref<MasterTag | Tag>

  @Prop(ArrOf(TypeRef(process.class.State)), process.string.States)
    states!: Ref<State>[]

  @Prop(TypeBoolean(), process.string.ParallelExecutionForbidden)
    parallelExecutionForbidden?: boolean

  @Prop(TypeBoolean(), process.string.StartAutomatically)
    autoStart: boolean | undefined
}

@Model(process.class.Execution, core.class.Doc, DOMAIN_PROCESS)
export class TExecution extends TDoc implements Execution {
  @Prop(TypeRef(contact.mixin.Employee), contact.string.Employee)
  @ReadOnly()
    assignee!: Ref<Employee>

  @Prop(TypeRef(process.class.Process), process.string.Process)
  @ReadOnly()
    process!: Ref<TProcess>

  @Prop(TypeRef(process.class.ProcessToDo), time.string.ToDo)
  @ReadOnly()
    currentToDo!: Ref<ProcessToDo> | null

  @Prop(TypeRef(process.class.State), process.string.Step)
  @ReadOnly()
    currentState!: Ref<State>

  @Prop(TypeBoolean(), process.string.Done)
  @ReadOnly()
    done!: boolean

  @Prop(TypeRecord(), process.string.Rollback)
  @ReadOnly()
    rollback!: Record<Ref<State>, Tx[]>

  @Prop(TypeRef(card.class.Card), card.string.Card)
  @ReadOnly()
    card!: Ref<Card>

  @Prop(TypeAny(process.component.ErrorPresenter, process.string.Error), process.string.Error)
  @ReadOnly()
    error?: ExecutionError[] | null
}

@Model(process.class.ProcessToDo, time.class.ToDo)
export class TProcessToDo extends TToDo implements ProcessToDo {
  execution!: Ref<Execution>

  state!: Ref<State>
}

@Model(process.class.Method, core.class.Doc, DOMAIN_MODEL)
export class TMethod extends TDoc implements Method<Doc> {
  label!: IntlString

  objectClass!: Ref<Class<Doc>>

  description?: IntlString

  editor!: AnyComponent

  systemOnly!: boolean

  presenter?: AnyComponent

  requiredParams!: string[]
}

@Model(process.class.State, core.class.Doc, DOMAIN_MODEL)
export class TState extends TDoc implements State {
  process!: Ref<Process>
  title!: string
  actions!: Step<Doc>[]
  endAction?: Step<Doc> | null
}

@Model(process.class.ProcessFunction, core.class.Doc, DOMAIN_MODEL)
export class TProcessFunction extends TDoc implements ProcessFunction {
  of!: Ref<Class<Doc<Space>>>
  category: AttributeCategory | undefined
  label!: IntlString
  editor?: AnyComponent
  allowMany?: boolean
}

export * from './migration'

export function createModel (builder: Builder): void {
  builder.createModel(TProcess, TExecution, TProcessToDo, TMethod, TState, TProcessFunction)

  createAction(
    builder,
    {
      action: view.actionImpl.ValueSelector,
      actionPopup: process.component.RunProcessPopup,
      actionProps: {
        attribute: ''
      },
      label: process.string.RunProcess,
      icon: process.icon.Process,
      input: 'focus',
      category: view.category.General,
      target: card.class.Card,
      context: {
        mode: ['context', 'browser']
      }
    },
    process.action.RunProcess
  )

  createAction(
    builder,
    {
      action: process.actionImpl.ContinueExecution,
      query: {
        error: { $exists: true, $ne: null }
      },
      label: process.string.Continue,
      icon: process.icon.Process,
      input: 'focus',
      category: view.category.General,
      target: process.class.Execution,
      context: {
        mode: ['context', 'browser']
      }
    },
    process.action.ContinueExecution
  )

  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: process.string.Processes,
      icon: process.icon.Process,
      accessLevel: AccountRole.User,
      alias: processId,
      hidden: false,
      component: process.component.Main
    },
    process.app.Process
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.UpperCase
    },
    process.function.UpperCase
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.LowerCase
    },
    process.function.LowerCase
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeString,
      category: 'attribute',
      label: process.string.Trim
    },
    process.function.Trim
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
      category: undefined,
      label: process.string.FirstValue
    },
    process.function.FirstValue
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.ArrOf,
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
      category: undefined,
      label: process.string.Random
    },
    process.function.Random
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeNumber,
      category: 'attribute',
      label: process.string.Add,
      allowMany: true,
      editor: process.component.NumberOffsetEditor
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
      allowMany: true,
      editor: process.component.NumberOffsetEditor
    },
    process.function.Subtract
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeDate,
      category: 'attribute',
      label: process.string.Offset,
      editor: process.component.DateOffsetEditor
    },
    process.function.Offset
  )

  builder.createDoc(
    process.class.ProcessFunction,
    core.space.Model,
    {
      of: core.class.TypeDate,
      category: 'attribute',
      label: process.string.FirstWorkingDayAfter
    },
    process.function.FirstWorkingDayAfter
  )

  builder.mixin(process.class.Process, core.class.Class, view.mixin.AttributePresenter, {
    presenter: process.component.ProcessPresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      variant: 'cardExecutions',
      attachTo: process.class.Execution,
      descriptor: view.viewlet.List,
      props: {
        baseMenuClass: process.class.Execution
      },
      viewOptions: {
        groupBy: ['process', 'assignee', 'done'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending]
        ],
        other: [
          {
            key: 'showDone',
            type: 'toggle',
            defaultValue: true,
            actionTarget: 'query',
            action: process.function.ShowDoneQuery,
            label: process.string.ShowDone
          }
        ]
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['process', 'currentState']
      },
      config: [
        {
          key: '',
          label: process.string.Process,
          presenter: process.component.ExecutonPresenter,
          displayProps: { key: 'process', fixed: 'left' }
        },
        {
          key: '',
          label: process.string.Step,
          presenter: process.component.ExecutonProgressPresenter,
          displayProps: { key: 'state', fixed: 'left' }
        },
        { key: '', presenter: process.component.ExecutonPresenter, displayProps: { grow: true } },
        {
          key: 'assignee',
          displayProps: { key: 'assignee', fixed: 'right' },
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
        },
        {
          key: 'modifiedOn',
          displayProps: { fixed: 'right' }
        },
        {
          key: 'createdOn',
          displayProps: { fixed: 'right' }
        }
      ]
    },
    process.viewlet.CardExecutions
  )

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: process.class.Execution,
      descriptor: view.viewlet.List,
      props: {
        baseMenuClass: process.class.Execution
      },
      viewOptions: {
        groupBy: ['process', 'assignee', 'done'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending]
        ],
        other: [
          {
            key: 'showDone',
            type: 'toggle',
            defaultValue: true,
            actionTarget: 'query',
            action: process.function.ShowDoneQuery,
            label: process.string.ShowDone
          }
        ]
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['process', 'currentState']
      },
      config: [
        {
          key: 'card',
          displayProps: { key: 'card', fixed: 'left' }
        },
        {
          key: '',
          label: process.string.Process,
          presenter: process.component.ExecutonPresenter,
          displayProps: { key: 'process', fixed: 'left' }
        },
        {
          key: '',
          label: process.string.Step,
          presenter: process.component.ExecutonProgressPresenter,
          displayProps: { key: 'state', fixed: 'left' }
        },
        { key: '', presenter: process.component.ExecutonPresenter, displayProps: { grow: true } },
        {
          key: 'assignee',
          displayProps: { key: 'assignee', fixed: 'right' },
          props: { kind: 'list', shouldShowName: false, avatarSize: 'x-small' }
        },
        {
          key: 'modifiedOn',
          displayProps: { fixed: 'right' }
        },
        {
          key: 'createdOn',
          displayProps: { fixed: 'right' }
        }
      ]
    },
    process.viewlet.ExecutionsList
  )

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: card.extensions.EditCardExtension,
    component: process.component.ProcessesExtension,
    props: {}
  })

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.RunProcess,
      objectClass: process.class.Process,
      editor: process.component.SubProcessEditor,
      presenter: process.component.SubProcessPresenter,
      systemOnly: false,
      requiredParams: ['_id']
    },
    process.method.RunSubProcess
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CreateToDo,
      editor: process.component.ToDoEditor,
      objectClass: process.class.ProcessToDo,
      presenter: process.component.ToDoPresenter,
      systemOnly: true,
      requiredParams: ['state', 'title', 'user']
    },
    process.method.CreateToDo
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UpdateCard,
      editor: process.component.UpdateCardEditor,
      objectClass: card.class.Card,
      presenter: process.component.UpdateCardPresenter,
      systemOnly: false,
      requiredParams: []
    },
    process.method.UpdateCard
  )

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'processes',
    label: process.string.Processes,
    component: process.component.ProcessesSettingSection
  })
}

export { processId } from '@hcengineering/process'

export default process
