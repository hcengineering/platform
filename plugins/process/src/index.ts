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
import { Employee } from '@hcengineering/contact'
import { Class, Doc, DocumentUpdate, ObjQueryType, Ref, Tx } from '@hcengineering/core'
import { Asset, IntlString, Plugin, plugin } from '@hcengineering/platform'
import { ToDo } from '@hcengineering/time'
import { AnyComponent } from '@hcengineering/ui'
import { AttributeCategory } from '@hcengineering/view'

/**
 * @public
 */
export const processId = 'process' as Plugin

export interface Process extends Doc {
  masterTag: Ref<MasterTag | Tag>
  name: string
  description: string
  states: Ref<State>[]
  parallelExecutionForbidden?: boolean
  autoStart?: boolean
}

export interface Execution extends Doc {
  process: Ref<Process>
  assignee: Ref<Employee> | null
  currentToDo: Ref<ProcessToDo> | null
  currentState: Ref<State> | null
  card: Ref<Card>
  done: boolean
  rollback: Record<Ref<State>, Tx[]>
  error?: ExecutionError[] | null
}

export interface ExecutionError {
  error: IntlString
  props: Record<string, any>
  intlProps: Record<string, IntlString>
}

export interface ProcessToDo extends ToDo {
  execution: Ref<Execution>
  state: Ref<State>
}

export type MethodParams<T extends Doc> = {
  [P in keyof T]?: ObjQueryType<T[P]> | string
} & DocumentUpdate<T>

export interface State extends Doc {
  process: Ref<Process>
  title: string
  actions: Step<Doc>[]
  endAction?: Step<Doc> | null
}

export interface Step<T extends Doc> {
  methodId: Ref<Method<T>>
  params: MethodParams<T>
}

export interface Method<T extends Doc> extends Doc {
  label: IntlString
  objectClass: Ref<Class<T>>
  requiredParams: string[]
  systemOnly: boolean
  description?: IntlString
  editor?: AnyComponent
  presenter?: AnyComponent
}

export interface ProcessFunction extends Doc {
  of: Ref<Class<Doc>>
  editor?: AnyComponent
  category: AttributeCategory | undefined
  allowMany?: boolean
  label: IntlString
}

export * from './types'
export * from './utils'

export default plugin(processId, {
  class: {
    Process: '' as Ref<Class<Process>>,
    Execution: '' as Ref<Class<Execution>>,
    ProcessToDo: '' as Ref<Class<ProcessToDo>>,
    Method: '' as Ref<Class<Method<Doc>>>,
    State: '' as Ref<Class<State>>,
    ProcessFunction: '' as Ref<Class<ProcessFunction>>
  },
  method: {
    RunSubProcess: '' as Ref<Method<Process>>,
    CreateToDo: '' as Ref<Method<ProcessToDo>>,
    UpdateCard: '' as Ref<Method<Card>>
  },
  string: {
    Method: '' as IntlString,
    Execution: '' as IntlString,
    Process: '' as IntlString,
    Step: '' as IntlString,
    Error: '' as IntlString
  },
  error: {
    MethodNotFound: '' as IntlString,
    InternalServerError: '' as IntlString,
    EmptyRelatedObjectValue: '' as IntlString,
    RelatedObjectNotFound: '' as IntlString,
    RelationNotExists: '' as IntlString,
    EmptyAttributeContextValue: '' as IntlString,
    ObjectNotFound: '' as IntlString,
    AttributeNotExists: '' as IntlString
  },
  icon: {
    Process: '' as Asset,
    Steps: '' as Asset,
    States: '' as Asset
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
    FirstWorkingDayAfter: '' as Ref<ProcessFunction>
  }
})
