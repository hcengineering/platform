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
import { Class, Doc, DocumentUpdate, ObjQueryType, Ref, Tx, Type } from '@hcengineering/core'
import { Asset, IntlString, Plugin, plugin, Resource } from '@hcengineering/platform'
import { ToDo } from '@hcengineering/time'
import { AnyComponent } from '@hcengineering/ui'
import { AttributeCategory } from '@hcengineering/view'
import { SelectedExecutonContext } from './types'

/**
 * @public
 */
export const processId = 'process' as Plugin

// Process model dscription
export interface Process extends Doc {
  masterTag: Ref<MasterTag | Tag>
  name: string
  description: string
  initState: Ref<State>
  parallelExecutionForbidden?: boolean
  autoStart?: boolean
  context: Record<ContextId, ProcessContext>
  resultType?: Type<any>
}

export interface ProcessContext {
  name: string
  _class: Ref<Class<Doc>>
  action: StepId
  producer: Ref<Transition | State>
  isResult?: boolean
  type?: Type<any>
  value: SelectedExecutonContext
}

export type ContextId = string & { __contextId: true }

export interface Trigger extends Doc {
  icon: Asset
  label: IntlString
  requiredParams: string[]
  editor?: AnyComponent
  checkFunction?: Resource<CheckFunc>
}

export interface Transition extends Doc {
  process: Ref<Process>
  from: Ref<State>
  to: Ref<State> | null
  actions: Step<Doc>[]
  trigger: Ref<Trigger>
  triggerParams: Record<string, any>
}

export type CheckFunc = (params: Record<string, any>, doc: Doc) => Promise<boolean>

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
  transition: Ref<Transition> | null
}

export interface ProcessToDo extends ToDo {
  execution: Ref<Execution>
  // state which created todo
  state: Ref<State>
}

export type MethodParams<T extends Doc> = {
  [P in keyof T]?: ObjQueryType<T[P]> | string
} & DocumentUpdate<T>

export interface State extends Doc {
  process: Ref<Process>
  title: string
  actions: Step<Doc>[]
}

export type StepId = string & { __stepId: true }

export interface Step<T extends Doc> {
  _id: StepId
  contextId: ContextId | null
  methodId: Ref<Method<T>>
  params: MethodParams<T>
  result?: StepResult
}

export interface StepResult {
  _id: ContextId // context id
  name: string
  type: Type<any>
}

export interface Method<T extends Doc> extends Doc {
  label: IntlString
  objectClass: Ref<Class<T>>
  requiredParams: string[]
  description?: IntlString
  editor?: AnyComponent
  presenter?: AnyComponent
  contextClass: Ref<Class<Doc>> | null
}

export interface ProcessFunction extends Doc {
  type: 'transform' | 'reduce' | 'context'
  of: Ref<Class<Doc>>
  editor?: AnyComponent
  category: AttributeCategory | undefined
  allowMany?: boolean
  label: IntlString
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
    Trigger: '' as Ref<Class<Trigger>>
  },
  method: {
    RunSubProcess: '' as Ref<Method<Process>>,
    CreateToDo: '' as Ref<Method<ProcessToDo>>,
    UpdateCard: '' as Ref<Method<Card>>
  },
  trigger: {
    OnSubProcessesDone: '' as Ref<Trigger>,
    OnToDoClose: '' as Ref<Trigger>,
    OnToDoRemove: '' as Ref<Trigger>
  },
  triggerCheck: {
    ToDo: '' as Resource<CheckFunc>
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
    ContextValueNotProvided: '' as IntlString
  },
  icon: {
    Process: '' as Asset,
    Steps: '' as Asset,
    States: '' as Asset,
    ToDo: '' as Asset,
    WaitSubprocesses: '' as Asset,
    ToDoRemove: '' as Asset
  },
  function: {
    FirstValue: '' as Ref<ProcessFunction>,
    LastValue: '' as Ref<ProcessFunction>,
    Random: '' as Ref<ProcessFunction>,
    UpperCase: '' as Ref<ProcessFunction>,
    LowerCase: '' as Ref<ProcessFunction>,
    Trim: '' as Ref<ProcessFunction>,
    Add: '' as Ref<ProcessFunction>,
    Subtract: '' as Ref<ProcessFunction>,
    Offset: '' as Ref<ProcessFunction>,
    FirstWorkingDayAfter: '' as Ref<ProcessFunction>,
    RoleContext: '' as Ref<ProcessFunction>
  }
})
