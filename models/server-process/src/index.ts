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

import cardPlugin from '@hcengineering/card'
import core, { type Doc } from '@hcengineering/core'
import { Mixin, type Builder } from '@hcengineering/model'
import { TMethod, TProcessFunction, TTrigger } from '@hcengineering/model-process'
import type { Resource } from '@hcengineering/platform'
import process, { ExecutionStatus } from '@hcengineering/process'
import serverCore from '@hcengineering/server-core'
import serverProcess, {
  type RollbackFunc,
  type ExecuteFunc,
  type FuncImpl,
  type MethodImpl,
  type TransformFunc,
  type TriggerImpl,
  type CheckFunc
} from '@hcengineering/server-process'

export { serverProcessId } from '@hcengineering/server-process'

@Mixin(serverProcess.mixin.MethodImpl, process.class.Method)
export class TMethodImpl extends TMethod implements MethodImpl<Doc> {
  func!: Resource<ExecuteFunc>
}

@Mixin(serverProcess.mixin.FuncImpl, process.class.ProcessFunction)
export class TFuncImpl extends TProcessFunction implements FuncImpl {
  func!: Resource<TransformFunc>
}

@Mixin(serverProcess.mixin.TriggerImpl, process.class.Trigger)
export class TTriggerImpl extends TTrigger implements TriggerImpl {
  serverCheckFunc?: Resource<CheckFunc>
  rollbackFunc?: Resource<RollbackFunc>
  preventRollback?: boolean
}

export function createModel (builder: Builder): void {
  builder.createModel(TMethodImpl, TFuncImpl, TTriggerImpl)

  builder.mixin(process.trigger.OnToDoClose, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    serverCheckFunc: serverProcess.func.CheckToDoDone,
    rollbackFunc: serverProcess.rollbacks.ToDoCloseRollback
  })

  builder.mixin(process.trigger.OnToDoRemove, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    serverCheckFunc: serverProcess.func.CheckToDoCancelled,
    rollbackFunc: serverProcess.rollbacks.ToDoCancellRollback
  })

  builder.mixin(process.trigger.OnCardUpdate, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    preventRollback: true,
    serverCheckFunc: serverProcess.func.MatchCardCheck
  })

  builder.mixin(process.trigger.WhenFieldChanges, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    rollbackFunc: serverProcess.rollbacks.FieldChangedRollback, // set to null for now
    serverCheckFunc: serverProcess.func.FieldChangedCheck
  })

  builder.mixin(process.trigger.OnApproveRequestApproved, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    preventRollback: true,
    serverCheckFunc: serverProcess.func.ApproveRequestApproved
  })

  builder.mixin(process.trigger.OnApproveRequestRejected, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    preventRollback: true,
    serverCheckFunc: serverProcess.func.ApproveRequestRejected
  })

  builder.mixin(process.trigger.OnExecutionStart, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    preventRollback: true
  })

  // builder.mixin(process.trigger.OnEvent, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
  //   serverCheckFunc: serverProcess.func.EventCheck
  // })

  builder.mixin(process.trigger.OnTime, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    preventRollback: true,
    serverCheckFunc: serverProcess.func.CheckTime
  })

  builder.mixin(process.trigger.OnSubProcessesDone, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    preventRollback: true,
    serverCheckFunc: serverProcess.func.CheckSubProcessesDone
  })

  builder.mixin(process.trigger.OnSubProcessMatch, process.class.Trigger, serverProcess.mixin.TriggerImpl, {
    preventRollback: true,
    serverCheckFunc: serverProcess.func.CheckSubProcessMatch
  })

  builder.mixin(process.method.RunSubProcess, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.RunSubProcess
  })

  builder.mixin(process.method.CancelSubProcess, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.CancelSubProcess
  })

  builder.mixin(process.method.CreateToDo, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.CreateToDo
  })

  builder.mixin(process.method.UpdateCard, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.UpdateCard
  })

  builder.mixin(process.method.CreateCard, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.CreateCard
  })

  builder.mixin(process.method.AddRelation, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.AddRelation
  })

  builder.mixin(process.method.AddTag, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.AddTag
  })

  builder.mixin(process.method.RequestApproval, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.RequestApproval
  })

  builder.mixin(process.method.CancelToDo, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.CancelToDo
  })

  builder.mixin(process.method.LockCard, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.LockCard
  })

  builder.mixin(process.method.LockSection, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.LockSection
  })

  builder.mixin(process.method.UnlockCard, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.UnlockCard
  })

  builder.mixin(process.method.UnlockSection, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.UnlockSection
  })

  builder.mixin(process.method.LockField, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.LockField
  })

  builder.mixin(process.method.UnlockField, process.class.Method, serverProcess.mixin.MethodImpl, {
    func: serverProcess.func.UnlockField
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

  builder.mixin(process.function.All, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.All
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

  builder.mixin(process.function.Prepend, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Prepend
  })

  builder.mixin(process.function.Append, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Append
  })

  builder.mixin(process.function.Replace, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Replace
  })

  builder.mixin(process.function.ReplaceAll, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.ReplaceAll
  })

  builder.mixin(process.function.Split, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Split
  })

  builder.mixin(process.function.Cut, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Cut
  })

  builder.mixin(process.function.Add, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Add
  })

  builder.mixin(process.function.Subtract, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Subtract
  })

  builder.mixin(process.function.Multiply, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Multiply
  })

  builder.mixin(process.function.Divide, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Divide
  })

  builder.mixin(process.function.Modulo, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Modulo
  })

  builder.mixin(process.function.Power, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Power
  })

  builder.mixin(process.function.Sqrt, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Sqrt
  })

  builder.mixin(process.function.Round, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Round
  })

  builder.mixin(process.function.Absolute, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Absolute
  })

  builder.mixin(process.function.Ceil, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Ceil
  })

  builder.mixin(process.function.Floor, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Floor
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

  builder.mixin(process.function.CurrentDate, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.CurrentDate
  })

  builder.mixin(process.function.CurrentEmployee, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.CurrentUser
  })

  builder.mixin(process.function.CurrentUser, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.CurrentUser
  })

  builder.mixin(process.function.Insert, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Insert
  })

  builder.mixin(process.function.Remove, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Remove
  })

  builder.mixin(process.function.RemoveFirst, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.RemoveFirst
  })

  builder.mixin(process.function.RemoveLast, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.RemoveLast
  })

  builder.mixin(process.function.EmptyArray, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.EmptyArray
  })

  builder.mixin(process.function.FirstMatchValue, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.FirstMatchValue
  })

  builder.mixin(process.function.Filter, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.Filter
  })

  builder.mixin(
    process.function.ExecutionEmployeeInitiator,
    process.class.ProcessFunction,
    serverProcess.mixin.FuncImpl,
    {
      func: serverProcess.transform.ExecutionInitiator
    }
  )

  builder.mixin(process.function.ExecutionInitiator, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.ExecutionInitiator
  })

  builder.mixin(process.function.ExecutionStarted, process.class.ProcessFunction, serverProcess.mixin.FuncImpl, {
    func: serverProcess.transform.ExecutionStarted
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
    trigger: serverProcess.trigger.OnCustomEvent,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: process.class.ProcessCustomEvent
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnExecutionRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
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
    trigger: serverProcess.trigger.OnCardUpdate,
    txMatch: {
      _class: { $in: [core.class.TxUpdateDoc, core.class.TxMixin] },
      objectClass: cardPlugin.class.Card
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnProcessRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: process.class.Process
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnStateRemove,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: process.class.State
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnTransition,
    txMatch: {
      objectClass: process.class.Transition
    },
    isAsync: true
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverProcess.trigger.OnCardCreate,
    txMatch: {
      _class: core.class.TxCreateDoc,
      objectClass: cardPlugin.class.Card
    },
    isAsync: true
  })
}
