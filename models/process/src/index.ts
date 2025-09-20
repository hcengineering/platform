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
  type Rank,
  type Ref,
  SortingOrder,
  type Space,
  type Tx
} from '@hcengineering/core'
import {
  type Builder,
  Hidden,
  Model,
  Prop,
  ReadOnly,
  TypeAny,
  TypeBoolean,
  TypeRank,
  TypeRef,
  TypeString,
  UX
} from '@hcengineering/model'
import { TDoc } from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import { TToDo } from '@hcengineering/model-time'
import view, { createAction } from '@hcengineering/model-view'
import workbench from '@hcengineering/model-workbench'
import { type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import {
  type CheckFunc,
  type ContextId,
  type CreatedContext,
  type Execution,
  type ExecutionContext,
  type ExecutionError,
  type ExecutionLog,
  type ExecutionLogAction,
  type ExecutionStatus,
  type Method,
  type MethodParams,
  type Process,
  type ProcessContext,
  type ProcessFunction,
  type ProcessToDo,
  type State,
  type Step,
  type Transition,
  type Trigger,
  type UpdateCriteriaComponent,
  processId
} from '@hcengineering/process'
import time from '@hcengineering/time'
import { type AnyComponent } from '@hcengineering/ui'
import { type AttributeCategory } from '@hcengineering/view'
import process from './plugin'

const DOMAIN_PROCESS = 'process' as Domain
const DOMAIN_PROCESS_LOG = 'process-log' as Domain

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

  presenter?: AnyComponent

  icon!: Asset

  requiredParams!: string[]

  checkFunction?: Resource<CheckFunc>

  init!: boolean

  auto?: boolean
}

@Model(process.class.Transition, core.class.Doc, DOMAIN_MODEL)
export class TTransition extends TDoc implements Transition {
  @Prop(TypeRef(process.class.Process), process.string.Process)
    process!: Ref<Process>

  @Prop(TypeRef(process.class.State), process.string.From)
    from!: Ref<State> | null

  @Prop(TypeRef(process.class.State), process.string.To)
    to!: Ref<State>

  @Prop(TypeAny(process.component.ActionsPresenter, process.string.Actions), process.string.Actions)
    actions!: Step<Doc>[]

  @Prop(TypeRef(process.class.Trigger), process.string.Trigger)
    trigger!: Ref<Trigger>

  triggerParams!: Record<string, any>

  @Prop(TypeRank(), core.string.Rank)
  @Hidden()
    rank!: Rank
}

@Model(process.class.ExecutionLog, core.class.Doc, DOMAIN_PROCESS_LOG)
export class TExecutionLog extends TDoc implements ExecutionLog {
  @Prop(TypeRef(process.class.Execution), process.string.Execution)
    execution!: Ref<Execution>

  @Prop(TypeRef(process.class.Process), process.string.Process)
    process!: Ref<Process>

  @Prop(TypeRef(card.class.Card), card.string.Card)
    card!: Ref<Card>

  @Prop(TypeRef(process.class.Transition), process.string.Transition)
    transition?: Ref<Transition>

  @Prop(TypeAny(process.component.LogActionPresenter, process.string.LogAction), process.string.LogAction)
    action!: ExecutionLogAction
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
@UX(process.string.ToDo)
export class TProcessToDo extends TToDo implements ProcessToDo {
  execution!: Ref<Execution>

  @Prop(TypeBoolean(), process.string.Rollback)
    withRollback!: boolean
}

@Model(process.class.Method, core.class.Doc, DOMAIN_MODEL)
export class TMethod extends TDoc implements Method<Doc> {
  label!: IntlString

  objectClass!: Ref<Class<Doc>>

  description?: IntlString

  editor!: AnyComponent

  createdContext!: CreatedContext

  presenter?: AnyComponent

  requiredParams!: string[]

  defaultParams?: MethodParams<Doc>
}

@Model(process.class.State, core.class.Doc, DOMAIN_MODEL)
export class TState extends TDoc implements State {
  @Prop(TypeRef(process.class.Process), process.string.Process)
  @ReadOnly()
    process!: Ref<Process>

  @Prop(TypeString(), core.string.Name)
    title!: string

  @Prop(TypeRank(), core.string.Rank)
  @Hidden()
    rank!: Rank
}

@Model(process.class.ProcessFunction, core.class.Doc, DOMAIN_MODEL)
export class TProcessFunction extends TDoc implements ProcessFunction {
  of!: Ref<Class<Doc<Space>>>
  category: AttributeCategory | undefined
  label!: IntlString
  editor?: AnyComponent
  presenter?: AnyComponent
  allowMany?: boolean
  type!: 'transform' | 'reduce' | 'context'
}

@Model(process.class.UpdateCriteriaComponent, core.class.Doc, DOMAIN_MODEL)
export class TUpdateCriteriaComponent extends TDoc implements UpdateCriteriaComponent {
  category!: AttributeCategory

  editor!: AnyComponent

  of!: Ref<Class<Doc<Space>>>
}

export * from './migration'

export function createModel (builder: Builder): void {
  builder.createModel(
    TProcess,
    TExecution,
    TProcessToDo,
    TMethod,
    TState,
    TProcessFunction,
    TTransition,
    TTrigger,
    TExecutionLog,
    TUpdateCriteriaComponent
  )

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
        groupBy: ['process', 'currentState'],
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
        ],
        groupDepth: 1
      },
      configOptions: {
        strict: true,
        hiddenKeys: ['process', 'currentState']
      },
      config: [
        {
          key: '',
          label: process.string.Process,
          presenter: process.component.ExecutonPresenter
        },
        {
          key: 'currentState',
          label: process.string.Step,
          presenter: process.component.ExecutonProgressPresenter
        },
        {
          key: '',
          presenter: process.component.ExecutionMyToDos,
          label: process.string.ToDo,
          displayProps: { key: 'todos' }
        },
        { key: '', presenter: process.component.ExecutonPresenter, displayProps: { grow: true } },
        {
          key: 'modifiedOn',
          displayProps: { fixed: 'right', dividerBefore: true }
        },
        {
          key: 'createdOn',
          displayProps: { fixed: 'right', dividerBefore: true }
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
        groupBy: ['process', 'currentState', 'card'],
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
          key: 'card'
        },
        {
          key: '',
          label: process.string.Process,
          presenter: process.component.ExecutonPresenter
        },
        {
          key: 'currentState',
          label: process.string.Step,
          presenter: process.component.ExecutonProgressPresenter
        },
        {
          key: '',
          presenter: process.component.ExecutionMyToDos,
          label: process.string.ToDo,
          displayProps: { key: 'todos' }
        },
        { key: '', presenter: process.component.ExecutonPresenter, displayProps: { grow: true } },
        {
          key: 'modifiedOn',
          displayProps: { fixed: 'right', dividerBefore: true }
        },
        {
          key: 'createdOn',
          displayProps: { fixed: 'right', dividerBefore: true }
        }
      ]
    },
    process.viewlet.ExecutionsList
  )

  builder.mixin(process.class.Transition, core.class.Class, view.mixin.AttributePresenter, {
    presenter: process.component.TransitionRefPresenter
  })

  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: process.class.ExecutionLog,
      descriptor: view.viewlet.List,
      props: {
        baseMenuClass: process.class.ExecutionLog
      },
      viewOptions: {
        groupBy: ['transition', 'action'],
        orderBy: [
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending]
        ],
        other: [],
        groupDepth: 1
      },
      configOptions: {
        strict: true,
        hiddenKeys: []
      },
      config: [
        {
          key: 'action',
          presenter: process.component.LogActionPresenter
        },
        {
          key: 'transition',
          label: process.string.Transition,
          presenter: process.component.TransitionRefPresenter
        },
        {
          key: '',
          presenter: view.component.GrowPresenter,
          displayProps: { grow: true }
        },
        {
          key: 'createdBy',
          displayProps: { fixed: 'right' }
        },
        {
          key: 'createdOn',
          displayProps: { fixed: 'right', dividerBefore: true }
        }
      ]
    },
    process.viewlet.ExecutionLogList
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
      component: process.component.ProcessesCardSection,
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
      createdContext: { _class: process.class.Execution },
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
      createdContext: { _class: process.class.ProcessToDo, nameField: 'title' },
      requiredParams: ['title', 'user'],
      defaultParams: {
        withRollback: true
      }
    },
    process.method.CreateToDo
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnExecutionStart,
      icon: process.icon.Process,
      init: true,
      requiredParams: []
    },
    process.trigger.OnExecutionStart
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.UpdateCard,
      editor: process.component.UpdateCardEditor,
      objectClass: card.class.Card,
      createdContext: null,
      presenter: process.component.UpdateCardPresenter,
      requiredParams: []
    },
    process.method.UpdateCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: process.string.CreateCard,
      objectClass: card.class.Card,
      editor: process.component.CreateCardEditor,
      presenter: process.component.CreateCardPresenter,
      createdContext: { _class: card.class.Card },
      requiredParams: ['title', '_class']
    },
    process.method.CreateCard
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: core.string.AddRelation,
      objectClass: core.class.Relation,
      editor: process.component.AddRelationEditor,
      presenter: process.component.AddRelationPresenter,
      createdContext: { _class: core.class.Relation },
      requiredParams: ['association', 'direction', '_id']
    },
    process.method.AddRelation
  )

  builder.createDoc(
    process.class.Method,
    core.space.Model,
    {
      label: card.string.AddTag,
      objectClass: card.class.Tag,
      editor: process.component.AddTagEditor,
      presenter: process.component.AddTagPresenter,
      createdContext: { _class: card.class.Card },
      requiredParams: ['_id']
    },
    process.method.AddTag
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnToDoDone,
      icon: process.icon.ToDo,
      editor: process.component.ToDoCloseEditor,
      presenter: process.component.ToDoSettingPresenter,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ToDo,
      init: false,
      auto: true
    },
    process.trigger.OnToDoClose
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnToDoCancelled,
      icon: process.icon.ToDoRemove,
      editor: process.component.ToDoRemoveEditor,
      presenter: process.component.ToDoSettingPresenter,
      requiredParams: ['_id'],
      checkFunction: process.triggerCheck.ToDo,
      init: false,
      auto: true
    },
    process.trigger.OnToDoRemove
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnCardUpdate,
      icon: process.icon.OnCardUpdate,
      editor: process.component.CardUpdateEditor,
      presenter: process.component.CardUpdatePresenter,
      requiredParams: [],
      checkFunction: process.triggerCheck.UpdateCheck,
      init: false,
      auto: true
    },
    process.trigger.OnCardUpdate
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.OnSubProcessesDone,
      icon: process.icon.WaitSubprocesses,
      checkFunction: process.triggerCheck.SubProcessesDoneCheck,
      requiredParams: [],
      init: false,
      auto: true
    },
    process.trigger.OnSubProcessesDone
  )

  builder.createDoc(
    process.class.Trigger,
    core.space.Model,
    {
      label: process.string.WaitUntil,
      icon: process.icon.Time,
      requiredParams: [],
      init: false,
      auto: true,
      editor: process.component.TimeEditor,
      presenter: process.component.TimePresenter,
      checkFunction: process.triggerCheck.Time
    },
    process.trigger.OnTime
  )

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'processes',
    label: process.string.Processes,
    component: process.component.ProcessesSettingSection
  })

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: workbench.extensions.WorkbenchExtensions,
    component: process.component.NotifierExtension
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.StringCriteria,
    of: core.class.TypeString
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.StringCriteria,
    of: core.class.TypeHyperlink
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.NumberCriteria,
    of: core.class.TypeNumber
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.DateCriteria,
    of: core.class.TypeDate
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.BooleanCriteria,
    of: core.class.TypeBoolean
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'array',
    editor: process.criteriaEditor.ArrayCriteria,
    of: core.class.ArrOf
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.EnumCriteria,
    of: core.class.EnumOf
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'object',
    editor: process.criteriaEditor.RefCriteria,
    of: core.class.RefTo
  })
}

export { processId } from '@hcengineering/process'

export default process
