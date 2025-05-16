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

import card, { type Card, type MasterTag, type Tag } from '@hcengineering/card'
import contact from '@hcengineering/contact'
import core, {
  AccountRole,
  type Class,
  DOMAIN_MODEL,
  type Doc,
  type Domain,
  type Ref,
  SortingOrder,
  type Space,
  type Tx,
  type Type
} from '@hcengineering/core'
import { type Builder, Model, Prop, ReadOnly, TypeAny, TypeBoolean, TypeRef, TypeString } from '@hcengineering/model'
import { TDoc } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import { TToDo } from '@hcengineering/model-time'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import {
  type CheckFunc,
  type ContextId,
  type Execution,
  type ExecutionContext,
  type ExecutionError,
  type ExecutionStatus,
  type Method,
  type Process,
  type ProcessContext,
  type ProcessFunction,
  type ProcessToDo,
  type State,
  type Step,
  type Transition,
  type Trigger,
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

  @Prop(TypeRef(process.class.State), process.string.NewState)
    initState!: Ref<State>

  @Prop(TypeBoolean(), process.string.ParallelExecutionForbidden)
    parallelExecutionForbidden?: boolean

  @Prop(TypeBoolean(), process.string.StartAutomatically)
    autoStart: boolean | undefined

  context!: Record<ContextId, ProcessContext>
}

@Model(process.class.Trigger, core.class.Doc, DOMAIN_MODEL)
export class TTrigger extends TDoc implements Trigger {
  label!: IntlString

  editor?: AnyComponent

  icon!: Asset

  requiredParams!: string[]

  checkFunction?: Resource<CheckFunc>
}

@Model(process.class.Transition, core.class.Doc, DOMAIN_MODEL)
export class TTransition extends TDoc implements Transition {
  @Prop(TypeRef(process.class.Process), process.string.Process)
    process!: Ref<Process>

  @Prop(TypeRef(process.class.State), process.string.From)
    from!: Ref<State>

  @Prop(TypeRef(process.class.State), process.string.To)
    to!: Ref<State> | null

  @Prop(TypeAny(process.component.ActionsPresenter, process.string.Actions), process.string.Actions)
    actions!: Step<Doc>[]

  @Prop(TypeRef(process.class.Trigger), process.string.Trigger)
    trigger!: Ref<Trigger>

  triggerParams!: Record<string, any>
}

@Model(process.class.Execution, core.class.Doc, DOMAIN_PROCESS)
export class TExecution extends TDoc implements Execution {
  @Prop(TypeRef(process.class.Process), process.string.Process)
  @ReadOnly()
    process!: Ref<Process>

  @Prop(TypeRef(process.class.State), process.string.Step)
  @ReadOnly()
    currentState!: Ref<State>

  rollback!: Tx[][]

  @Prop(TypeRef(card.class.Card), card.string.Card)
  @ReadOnly()
    card!: Ref<Card>

  @Prop(TypeAny(process.component.ErrorPresenter, process.string.Error), process.string.Error)
  @ReadOnly()
    error?: ExecutionError[] | null

  parentId?: Ref<Execution>

  context!: ExecutionContext

  result?: any

  status!: ExecutionStatus
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

  contextClass!: Ref<Class<Doc>> | null

  presenter?: AnyComponent

  requiredParams!: string[]
}

@Model(process.class.State, core.class.Doc, DOMAIN_MODEL)
export class TState extends TDoc implements State {
  process!: Ref<Process>
  title!: string
  actions!: Step<Doc>[]
  resultType?: Type<any> | null
}

@Model(process.class.ProcessFunction, core.class.Doc, DOMAIN_MODEL)
export class TProcessFunction extends TDoc implements ProcessFunction {
  of!: Ref<Class<Doc<Space>>>
  category: AttributeCategory | undefined
  label!: IntlString
  editor?: AnyComponent
  allowMany?: boolean
  type!: 'transform' | 'reduce' | 'context'
}

export * from './migration'

export function createModel (builder: Builder): void {
  builder.createModel(TProcess, TExecution, TProcessToDo, TMethod, TState, TProcessFunction, TTransition, TTrigger)

  createAction(builder, {
    action: view.actionImpl.Delete,
    label: view.string.Delete,
    icon: view.icon.Delete,
    keyBinding: ['Meta + Backspace'],
    category: view.category.General,
    input: 'any',
    target: process.class.Transition,
    context: { mode: ['context', 'browser'], group: 'remove' },
    visibilityTester: view.function.CanDeleteObject
  })

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
    presentation.class.PresentationMiddlewareFactory,
    core.space.Model,
    {
      createPresentationMiddleware: process.function.CreateMiddleware
    },
    process.pipeline.ProcessMiddleware
  )

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
      of: core.class.TypeNumber,
      type: 'transform',
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
      editor: process.component.NumberOffsetEditor,
      type: 'transform'
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
      editor: process.component.DateOffsetEditor,
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
      of: contact.mixin.Employee,
      editor: process.component.RoleEditor,
      category: 'array',
      label: core.string.Role,
      type: 'context'
    },
    process.function.RoleContext
  )

  builder.mixin(process.class.Process, core.class.Class, view.mixin.AttributePresenter, {
    presenter: process.component.ProcessPresenter
  })

  builder.mixin(process.class.Trigger, core.class.Class, view.mixin.AttributePresenter, {
    presenter: process.component.TriggerPresenter
  })

  builder.mixin(process.class.State, core.class.Class, view.mixin.AttributePresenter, {
    presenter: process.component.StatePresenter
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
        groupBy: ['process', 'done'],
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
        groupBy: ['process', 'done'],
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
    card.class.CardSection,
    core.space.Model,
    {
      label: process.string.Processes,
      component: process.component.ProcessesExtension,
      order: 350,
      navigation: []
    },
    process.section.CardProcesses
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.RunProcess,
      objectClass: process.class.Process,
      editor: process.component.SubProcessEditor,
      presenter: process.component.SubProcessPresenter,
      contextClass: process.class.Execution,
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
      contextClass: process.class.ProcessToDo,
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
      contextClass: null,
      presenter: process.component.UpdateCardPresenter,
      requiredParams: []
    },
    process.method.UpdateCard
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnSubProcessesDone,
      icon: process.icon.WaitSubprocesses,
      requiredParams: []
    },
    process.trigger.OnSubProcessesDone
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnToDoClose,
      icon: process.icon.ToDo,
      editor: process.component.ToDoCloseEditor,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ToDo
    },
    process.trigger.OnToDoClose
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnToDoRemove,
      icon: process.icon.ToDoRemove,
      editor: process.component.ToDoRemoveEditor,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ToDo
    },
    process.trigger.OnToDoRemove
  )

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'processes',
    label: process.string.Processes,
    component: process.component.ProcessesSettingSection
  })
}

export { processId } from '@hcengineering/process'

export default process
