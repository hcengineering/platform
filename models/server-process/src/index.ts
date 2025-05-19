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

import core, { type Doc } from '@hcengineering/core'
import { Mixin, type Builder } from '@hcengineering/model'
import { TMethod, TProcessFunction, TTrigger } from '@hcengineering/model-process'
import type { Resource } from '@hcengineering/platform'
import process, { type CheckFunc, ExecutionStatus } from '@hcengineering/process'
import serverCore from '@hcengineering/server-core'
import serverProcess, {
  type ExecuteFunc,
  type FuncImpl,
  type MethodImpl,
  type TransformFunc,
  type TriggerImpl
} from '@hcengineering/server-process'

export { serverProcessId } from '@hcengineering/server-process'

@Mixin(serverProcess.mixin.MethodImpl, process.class.Method)
export class TMethodImpl<T extends Doc> extends TMethod implements MethodImpl<T> {
  func!: Resource<ExecuteFunc>
}

@Mixin(serverProcess.mixin.FuncImpl, process.class.ProcessFunction)
export class TFuncImpl extends TProcessFunction implements FuncImpl {
  func!: Resource<TransformFunc>
}

@Mixin(serverProcess.mixin.TriggerImpl, process.class.Trigger)
export class TTriggerImpl extends TTrigger implements TriggerImpl {
  serverCheckFunc?: Resource<CheckFunc>
}

export function createModel (builder: Builder): void {
  builder.createModel(TMethodImpl, TFuncImpl, TTriggerImpl)

  builder.mixin(process.trigger.OnToDoClose, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    serverCheckFunc: serverProcess.func.CheckToDo
  })

  builder.mixin(process.trigger.OnToDoRemove, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    serverCheckFunc: serverProcess.func.CheckToDo
  })

  builder.mixin(process.method.RunSubProcess, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.RunSubProcess
  })

  builder.mixin(process.method.CreateToDo, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.CreateToDo
  })

  builder.mixin(process.method.UpdateCard, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.UpdateCard
  })

  builder.mixin(process.function.FirstValue, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.FirstValue
  })

  builder.mixin(process.function.LastValue, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.LastValue
  })

  builder.mixin(process.function.Random, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Random
  })

  builder.mixin(process.function.UpperCase, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.UpperCase
  })

  builder.mixin(process.function.LowerCase, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.LowerCase
  })

  builder.mixin(process.function.Trim, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Trim
  })

  builder.mixin(process.function.Add, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Add
  })

  builder.mixin(process.function.Subtract, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Subtract
  })

  builder.mixin(process.function.Offset, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Offset
  })

  builder.mixin(process.function.FirstWorkingDayAfter, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.FirstWorkingDayAfter
  })

  builder.mixin(process.function.RoleContext, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.RoleContext
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnExecutionContinue,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: process.class.Execution,
      'operations.status': ExecutionStatus.Active,
      space: core.space.Tx
    },
    isAsync: true
  })
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnExecutionCreate,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: process.class.Execution
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnProcessToDoClose,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: process.class.ProcessToDo
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnProcessToDoRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: process.class.ProcessToDo
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnProcessRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: process.class.Process
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnStateRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: process.class.State
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnStateActionsUpdate,
    txMatch: {
      _class: core.class.TxUpdateDoc,
      objectClass: process.class.State
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnTransition,
    txMatch: {
      objectClass: process.class.Transition
    }
  })
}
