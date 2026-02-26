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
import core, {
  AccountRole,
  type Class,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
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
import notification, { type NotificationGroup } from '@hcengineering/notification'
import { type Asset, type IntlString, type Resource } from '@hcengineering/platform'
import {
  type ApproveRequest,
  type CheckFunc,
  type ContextId,
  type CreatedContext,
  type EventButton,
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
  type ProcessCustomEvent,
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
import { defineMethods } from './actions'
import { defineFunctions } from './functions'
import { definePermissions } from './permission'
import process from './plugin'
import { defineTriggers } from './triggers'

export const DOMAIN_PROCESS = 'process' as Domain
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

  @Prop(TypeBoolean(), process.string.AutomationOnly)
    automationOnly: boolean | undefined

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
  @Prop(TypeRef(process.class.Execution), process.string.Execution)
    execution!: Ref<Execution>

  @Prop(TypeBoolean(), process.string.Rollback)
    withRollback!: boolean
}

@Model(process.class.ApproveRequest, process.class.ProcessToDo)
@UX(process.string.ApproveRequest)
export class TApproveRequest extends TProcessToDo implements ApproveRequest {
  @Prop(TypeBoolean(), process.string.IsApproved)
    approved?: boolean

  @Prop(TypeString(), process.string.RejectionReason)
    reason?: string

  group!: string

  card!: Ref<Card>
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

@Model(process.class.ProcessCustomEvent, core.class.Doc, DOMAIN_TRANSIENT)
export class TProcessCustomEvent extends TDoc implements ProcessCustomEvent {
  eventType!: string

  @Prop(TypeRef(process.class.Execution), process.string.Execution)
    execution!: Ref<Execution>

  @Prop(TypeRef(card.class.Card), card.string.Card)
    card!: Ref<Card>
}

@Model(process.class.EventButton, core.class.Doc, DOMAIN_PROCESS)
export class TEventButton extends TDoc implements EventButton {
  title!: string

  eventType!: string

  @Prop(TypeRef(process.class.Execution), process.string.Execution)
    execution!: Ref<Execution>

  @Prop(TypeRef(card.class.Card), card.string.Card)
    card!: Ref<Card>
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

  props!: Record<string, any>
}

export * from './migration'

export function createModel (builder: Builder): void {
  builder.createModel(
    TProcess,
    TExecution,
    TProcessToDo,
    TApproveRequest,
    TMethod,
    TState,
    TProcessFunction,
    TTransition,
    TTrigger,
    TExecutionLog,
    TUpdateCriteriaComponent,
    TProcessCustomEvent,
    TEventButton
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: true,
      label: process.string.NewProcessToDo,
      group: time.ids.TimeNotificationGroup,
      txClasses: [core.class.TxCreateDoc],
      objectClass: process.class.ProcessToDo,
      onlyOwn: true,
      defaultEnabled: true,
      templates: {
        textTemplate: '{body}',
        htmlTemplate: '<p>{body}</p>',
        subjectTemplate: '{title}'
      }
    },
    process.ids.ProcessToDoCreated
  )

  builder.createDoc(
    notification.class.NotificationType,
    core.space.Model,
    {
      hidden: false,
      generated: false,
      allowedForAuthor: true,
      label: process.string.ApproveRequest,
      group: time.ids.TimeNotificationGroup,
      txClasses: [core.class.TxCreateDoc],
      objectClass: process.class.ApproveRequest,
      onlyOwn: true,
      defaultEnabled: true,
      templates: {
        textTemplate: '{body}',
        htmlTemplate: '<p>{body}</p>',
        subjectTemplate: '{title}'
      }
    },
    process.ids.ApproveRequestCreated
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
      input: 'any',
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

  defineFunctions(builder)
  defineMethods(builder)
  defineTriggers(builder)

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
      variant: 'cardRequests',
      attachTo: process.class.ApproveRequest,
      descriptor: view.viewlet.List,
      props: {
        baseMenuClass: process.class.ApproveRequest
      },
      viewOptions: {
        groupBy: ['user', 'approved', 'execution'],
        orderBy: [
          ['approved', SortingOrder.Descending],
          ['modifiedOn', SortingOrder.Descending],
          ['createdOn', SortingOrder.Descending]
        ],
        other: []
      },
      configOptions: {
        strict: true
      },
      config: [
        'user',
        {
          key: '',
          presenter: view.component.GrowPresenter,
          displayProps: { grow: true }
        },
        'reason',
        {
          key: '',
          label: process.string.ApproveRequest,
          presenter: process.component.ApproveRequestPresenter
        }
      ]
    },
    process.viewlet.CardRequests
  )

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

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: card.extensions.EditCardExtension,
    component: process.component.RequestsExtension,
    props: {}
  })

  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: card.extensions.EditCardHeaderExtension,
    component: process.component.ProcessesHeaderExtension,
    props: {}
  })

  builder.createDoc(card.class.ExportExtension, core.space.Model, {
    func: process.function.ExportProcess
  })

  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: process.string.Processes,
      component: process.component.ProcessesCardSection,
      checkVisibility: process.function.CheckProcessSectionVisibility,
      order: 350,
      navigation: []
    },
    process.section.CardProcesses
  )

  builder.createDoc(
    card.class.CardSection,
    core.space.Model,
    {
      label: process.string.ApproveRequest,
      component: process.component.RequestsCardSection,
      checkVisibility: process.function.CheckRequestsSectionVisibility,
      order: 360,
      navigation: []
    },
    process.section.CardApproveRequest
  )

  builder.createDoc(card.class.MasterTagEditorSection, core.space.Model, {
    id: 'processes',
    label: process.string.Processes,
    component: process.component.ProcessesSettingSection
  })

  builder.createDoc(notification.class.NotificationType, core.space.Model, {
    hidden: false,
    generated: false,
    allowedForAuthor: true,
    label: process.string.NewProcessToDo,
    group: time.ids.TimeNotificationGroup as Ref<NotificationGroup>,
    txClasses: [core.class.TxCreateDoc],
    objectClass: process.class.ProcessToDo,
    txMatch: {
      objectClass: process.class.ProcessToDo
    },
    defaultEnabled: true,
    templates: {
      textTemplate: '{body}',
      htmlTemplate: '<p>{body}</p>',
      subjectTemplate: '{title}'
    }
  })

  // builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
  //   extension: workbench.extensions.WorkbenchExtensions,
  //   component: process.component.NotifierExtension
  // })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.TypeString,
    props: {
      modes: ['Equal', 'StringContains', 'Exists']
    }
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.TypeHyperlink,
    props: {
      modes: ['Equal', 'StringContains', 'Exists']
    }
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.TypeNumber,
    props: {
      modes: ['Equal', 'GT', 'LT', 'Between', 'Exists']
    }
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.TypeDate,
    props: {
      modes: ['Equal', 'GT', 'LT', 'Between', 'Exists']
    }
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.TypeBoolean,
    props: {
      modes: ['Equal', 'NotEqual', 'Exists']
    }
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'array',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.ArrOf,
    props: {
      modes: [
        'ArrayAll',
        'ArrayAny',
        'ArrayNotIncludes',
        'ArraySizeEquals',
        'ArraySizeGt',
        'ArraySizeGte',
        'ArraySizeLt',
        'ArraySizeLte'
      ]
    }
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'attribute',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.EnumOf,
    props: {
      modes: ['Equal', 'NotEqual', 'Exists']
    }
  })

  builder.createDoc(process.class.UpdateCriteriaComponent, core.space.Model, {
    category: 'object',
    editor: process.criteriaEditor.BaseCriteria,
    of: core.class.RefTo,
    props: {
      modes: ['Equal', 'NotEqual', 'Exists']
    }
  })

  definePermissions(builder)

  builder.createDoc(card.class.PermissionObjectClass, core.space.Model, {
    objectClass: process.class.Execution
  })
}

export { processId } from '@hcengineering/process'

export default process
