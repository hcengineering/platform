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

import { Card, MasterTag, Tag } from '@hcengineering/card'
import { Association, Class, Client, Doc, DocumentUpdate, ObjQueryType, Rank, Ref, Tx, Type } from '@hcengineering/core'
import { Asset, IntlString, Plugin, plugin, Resource } from '@hcengineering/platform'
import { ToDo } from '@hcengineering/time'
import { AnyComponent } from '@hcengineering/ui'
import { AttributeCategory } from '@hcengineering/view'
import { SelectedExecutionContext } from './types'

/**
 * @public
 */
export const processId = 'process' as Plugin

// Process model dscription
export interface Process extends Doc {
  masterTag: Ref<MasterTag | Tag>
  name: string
  description: string
  parallelExecutionForbidden?: boolean
  autoStart?: boolean
  context: Record<ContextId, ProcessContext>
  resultType?: Type<any>
}

export interface ProcessContext {
  name: string
  _class: Ref<Class<Doc>>
  action: StepId
  index: number
  producer: Ref<Transition>
  isResult?: boolean
  type?: Type<any>
  value: SelectedExecutionContext
}

export type ContextId = string & { __contextId: true }

export interface Trigger extends Doc {
  icon: Asset
  label: IntlString
  requiredParams: string[]
  editor?: AnyComponent
  presenter?: AnyComponent
  checkFunction?: Resource<CheckFunc>
  init: boolean
  auto?: boolean
}

export interface Transition extends Doc {
  process: Ref<Process>
  from: Ref<State> | null
  to: Ref<State>
  actions: Step<Doc>[]
  trigger: Ref<Trigger>
  triggerParams: Record<string, any>
  rank: Rank
}

export interface ExecutionLog extends Doc {
  execution: Ref<Execution>
  card: Ref<Card>
  process: Ref<Process>
  transition?: Ref<Transition>
  action: ExecutionLogAction
}

export enum ExecutionLogAction {
  Started = 'started',
  Transition = 'transition',
  Rollback = 'rollback'
}

export type CheckFunc = (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
) => Promise<boolean>

export enum ExecutionStatus {
  Active = 'active',
  Done = 'done',
  Cancelled = 'cancelled'
}

export interface Execution extends Doc {
  process: Ref<Process>
  currentState: Ref<State>
  card: Ref<Card>
  rollback: Tx[][] // just stack
  error?: ExecutionError[] | null
  context: ExecutionContext
  result?: any
  parentId?: Ref<Execution>
  status: ExecutionStatus
}

export type ExecutionContext = Record<ContextId, any> & { __contextId: true }

export interface ExecutionError {
  error: IntlString
  props: Record<string, any>
  intlProps: Record<string, IntlString>
  transition: Ref<Transition> | undefined
}

export interface ProcessToDo extends ToDo {
  execution: Ref<Execution>

  withRollback: boolean

  results?: UserResult[]
}

export type MethodParams<T extends Doc> = {
  [P in keyof T]?: ObjQueryType<T[P]> | string
} & DocumentUpdate<T> &
Record<string, any>

export interface State extends Doc {
  process: Ref<Process>
  title: string
  rank: Rank
}

export type StepId = string & { __stepId: true }

export interface Step<T extends Doc> {
  _id: StepId
  context: StepContext | null
  methodId: Ref<Method<T>>
  params: MethodParams<T>
  results?: UserResult[]
}

export interface StepContext {
  _id: ContextId // context id
  _class?: Ref<Class<Doc>> // class of the context
}

export interface UserResult {
  _id: ContextId // context id
  name: string
  key?: string
  type: Type<any>
}

export interface Method<T extends Doc> extends Doc {
  label: IntlString
  objectClass: Ref<Class<T>>
  requiredParams: string[]
  description?: IntlString
  editor?: AnyComponent
  presenter?: AnyComponent
  createdContext: CreatedContext | null
  defaultParams?: MethodParams<T>
}

export interface CreatedContext {
  _class: Ref<Class<Doc>>
  nameField?: string
}

export interface ProcessFunction extends Doc {
  type: 'transform' | 'reduce' | 'context'
  of: Ref<Class<Doc>>
  editor?: AnyComponent
  presenter?: AnyComponent
  category: AttributeCategory | undefined
  allowMany?: boolean
  label: IntlString
}

export interface UpdateCriteriaComponent extends Doc {
  category: AttributeCategory
  editor: AnyComponent
  of: Ref<Class<Doc>>
}

export * from './errors'
export * from './types'
export * from './utils'

export default plugin(processId, {
  class: {
    Process: '' as Ref<Class<Process>>,
    Execution: '' as Ref<Class<Execution>>,
    ProcessToDo: '' as Ref<Class<ProcessToDo>>,
    Method: '' as Ref<Class<Method<Doc>>>,
    State: '' as Ref<Class<State>>,
    ProcessFunction: '' as Ref<Class<ProcessFunction>>,
    Transition: '' as Ref<Class<Transition>>,
    Trigger: '' as Ref<Class<Trigger>>,
    ExecutionLog: '' as Ref<Class<ExecutionLog>>,
    UpdateCriteriaComponent: '' as Ref<Class<UpdateCriteriaComponent>>
  },
  method: {
    RunSubProcess: '' as Ref<Method<Process>>,
    CreateToDo: '' as Ref<Method<ProcessToDo>>,
    UpdateCard: '' as Ref<Method<Card>>,
    CreateCard: '' as Ref<Method<Card>>,
    AddRelation: '' as Ref<Method<Association>>,
    AddTag: '' as Ref<Method<Tag>>
  },
  trigger: {
    OnCardUpdate: '' as Ref<Trigger>,
    OnSubProcessesDone: '' as Ref<Trigger>,
    OnToDoClose: '' as Ref<Trigger>,
    OnToDoRemove: '' as Ref<Trigger>,
    OnExecutionStart: '' as Ref<Trigger>,
    OnExecutionContinue: '' as Ref<Trigger>,
    OnTime: '' as Ref<Trigger>
  },
  triggerCheck: {
    ToDo: '' as Resource<CheckFunc>,
    UpdateCheck: '' as Resource<CheckFunc>,
    SubProcessesDoneCheck: '' as Resource<CheckFunc>,
    Time: '' as Resource<CheckFunc>
  },
  string: {
    Method: '' as IntlString,
    Execution: '' as IntlString,
    Process: '' as IntlString,
    Step: '' as IntlString,
    Error: '' as IntlString,
    From: '' as IntlString,
    To: '' as IntlString,
    Trigger: '' as IntlString,
    Actions: '' as IntlString
  },
  error: {
    MethodNotFound: '' as IntlString,
    InternalServerError: '' as IntlString,
    EmptyRelatedObjectValue: '' as IntlString,
    RelatedObjectNotFound: '' as IntlString,
    RelationNotExists: '' as IntlString,
    EmptyAttributeContextValue: '' as IntlString,
    ObjectNotFound: '' as IntlString,
    AttributeNotExists: '' as IntlString,
    UserRequestedValueNotProvided: '' as IntlString,
    ResultNotProvided: '' as IntlString,
    EmptyFunctionResult: '' as IntlString,
    ContextValueNotProvided: '' as IntlString,
    RequiredParamsNotProvided: '' as IntlString,
    TooDeepTransitionRecursion: '' as IntlString
  },
  icon: {
    Process: '' as Asset,
    Steps: '' as Asset,
    States: '' as Asset,
    ToDo: '' as Asset,
    OnCardUpdate: '' as Asset,
    WaitSubprocesses: '' as Asset,
    ToDoRemove: '' as Asset,
    Start: '' as Asset,
    Time: '' as Asset
  },
  function: {
    FirstValue: '' as Ref<ProcessFunction>,
    LastValue: '' as Ref<ProcessFunction>,
    Random: '' as Ref<ProcessFunction>,
    UpperCase: '' as Ref<ProcessFunction>,
    LowerCase: '' as Ref<ProcessFunction>,
    Trim: '' as Ref<ProcessFunction>,
    Prepend: '' as Ref<ProcessFunction>,
    Append: '' as Ref<ProcessFunction>,
    Replace: '' as Ref<ProcessFunction>,
    ReplaceAll: '' as Ref<ProcessFunction>,
    Split: '' as Ref<ProcessFunction>,
    Cut: '' as Ref<ProcessFunction>,
    Add: '' as Ref<ProcessFunction>,
    Subtract: '' as Ref<ProcessFunction>,
    Multiply: '' as Ref<ProcessFunction>,
    Divide: '' as Ref<ProcessFunction>,
    Modulo: '' as Ref<ProcessFunction>,
    Power: '' as Ref<ProcessFunction>,
    Round: '' as Ref<ProcessFunction>,
    Absolute: '' as Ref<ProcessFunction>,
    Ceil: '' as Ref<ProcessFunction>,
    Floor: '' as Ref<ProcessFunction>,
    Offset: '' as Ref<ProcessFunction>,
    FirstWorkingDayAfter: '' as Ref<ProcessFunction>,
    RoleContext: '' as Ref<ProcessFunction>,
    All: '' as Ref<ProcessFunction>,
    Insert: '' as Ref<ProcessFunction>,
    Remove: '' as Ref<ProcessFunction>,
    RemoveFirst: '' as Ref<ProcessFunction>,
    RemoveLast: '' as Ref<ProcessFunction>,
    CurrentEmployee: '' as Ref<ProcessFunction>,
    CurrentUser: '' as Ref<ProcessFunction>,
    CurrentDate: '' as Ref<ProcessFunction>
  }
})
