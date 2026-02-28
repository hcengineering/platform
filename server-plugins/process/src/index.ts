import { Doc, Mixin, Ref } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { Execution, Method, ProcessFunction, Trigger } from '@hcengineering/process'
import { TriggerFunc } from '@hcengineering/server-core'
import { ExecuteFunc, ProcessControl, RollbackFunc, TransformFunc } from './types'

export * from './types'

/**
 * @public
 */
export const serverProcessId = 'server-process' as Plugin

export type CheckFunc = (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
) => Promise<boolean>

export interface TriggerImpl extends Trigger {
  serverCheckFunc?: Resource<CheckFunc>
  rollbackFunc?: Resource<RollbackFunc>
  preventRollback?: boolean
}

export interface MethodImpl<T extends Doc> extends Method<T> {
  func: Resource<ExecuteFunc>
}

export interface FuncImpl extends ProcessFunction {
  func: Resource<TransformFunc>
}

/**
 * @public
 */
export default plugin(serverProcessId, {
  mixin: {
    MethodImpl: '' as Ref<Mixin<MethodImpl<Doc>>>,
    FuncImpl: '' as Ref<Mixin<FuncImpl>>,
    TriggerImpl: '' as Ref<Mixin<TriggerImpl>>
  },
  rollbacks: {
    ToDoCloseRollback: '' as Resource<RollbackFunc>,
    ToDoCancellRollback: '' as Resource<RollbackFunc>,
    FieldChangedRollback: '' as Resource<RollbackFunc>
  },
  func: {
    RunSubProcess: '' as Resource<ExecuteFunc>,
    CancelSubProcess: '' as Resource<ExecuteFunc>,
    CreateToDo: '' as Resource<ExecuteFunc>,
    UpdateCard: '' as Resource<ExecuteFunc>,
    CreateCard: '' as Resource<ExecuteFunc>,
    AddRelation: '' as Resource<ExecuteFunc>,
    WaitSubProcess: '' as Resource<ExecuteFunc>,
    AddTag: '' as Resource<ExecuteFunc>,
    RequestApproval: '' as Resource<ExecuteFunc>,
    LockCard: '' as Resource<ExecuteFunc>,
    LockSection: '' as Resource<ExecuteFunc>,
    UnlockCard: '' as Resource<ExecuteFunc>,
    UnlockSection: '' as Resource<ExecuteFunc>,
    CheckToDoDone: '' as Resource<CheckFunc>,
    CheckToDoCancelled: '' as Resource<CheckFunc>,
    MatchCardCheck: '' as Resource<CheckFunc>,
    FieldChangedCheck: '' as Resource<CheckFunc>,
    CheckSubProcessesDone: '' as Resource<CheckFunc>,
    CheckSubProcessMatch: '' as Resource<CheckFunc>,
    CheckTime: '' as Resource<CheckFunc>,
    EventCheck: '' as Resource<CheckFunc>,
    ApproveRequestApproved: '' as Resource<CheckFunc>,
    ApproveRequestRejected: '' as Resource<CheckFunc>,
    CancelToDo: '' as Resource<ExecuteFunc>
  },
  transform: {
    FirstValue: '' as Resource<TransformFunc>,
    LastValue: '' as Resource<TransformFunc>,
    Random: '' as Resource<TransformFunc>,
    All: '' as Resource<TransformFunc>,
    UpperCase: '' as Resource<TransformFunc>,
    LowerCase: '' as Resource<TransformFunc>,
    Trim: '' as Resource<TransformFunc>,
    Prepend: '' as Resource<TransformFunc>,
    Append: '' as Resource<TransformFunc>,
    Replace: '' as Resource<TransformFunc>,
    ReplaceAll: '' as Resource<TransformFunc>,
    Split: '' as Resource<TransformFunc>,
    Cut: '' as Resource<TransformFunc>,
    Add: '' as Resource<TransformFunc>,
    Subtract: '' as Resource<TransformFunc>,
    Multiply: '' as Resource<TransformFunc>,
    Divide: '' as Resource<TransformFunc>,
    Modulo: '' as Resource<TransformFunc>,
    Power: '' as Resource<TransformFunc>,
    Sqrt: '' as Resource<TransformFunc>,
    Round: '' as Resource<TransformFunc>,
    Absolute: '' as Resource<TransformFunc>,
    Ceil: '' as Resource<TransformFunc>,
    Floor: '' as Resource<TransformFunc>,
    Offset: '' as Resource<TransformFunc>,
    FirstWorkingDayAfter: '' as Resource<TransformFunc>,
    RoleContext: '' as Resource<TransformFunc>,
    Insert: '' as Resource<TransformFunc>,
    Remove: '' as Resource<TransformFunc>,
    RemoveFirst: '' as Resource<TransformFunc>,
    RemoveLast: '' as Resource<TransformFunc>,
    CurrentUser: '' as Resource<TransformFunc>,
    CurrentDate: '' as Resource<TransformFunc>,
    EmptyArray: '' as Resource<TransformFunc>,
    Filter: '' as Resource<TransformFunc>,
    FirstMatchValue: '' as Resource<TransformFunc>,
    ExecutionInitiator: '' as Resource<TransformFunc>,
    ExecutionStarted: '' as Resource<TransformFunc>
  },
  trigger: {
    OnTransition: '' as Resource<TriggerFunc>,
    OnCardCreate: '' as Resource<TriggerFunc>,
    OnCardUpdate: '' as Resource<TriggerFunc>,
    OnProcessRemove: '' as Resource<TriggerFunc>,
    OnStateRemove: '' as Resource<TriggerFunc>,
    OnExecutionCreate: '' as Resource<TriggerFunc>,
    OnProcessToDoClose: '' as Resource<TriggerFunc>,
    OnProcessToDoRemove: '' as Resource<TriggerFunc>,
    OnExecutionContinue: '' as Resource<TriggerFunc>,
    OnCustomEvent: '' as Resource<TriggerFunc>,
    OnExecutionRemove: '' as Resource<TriggerFunc>
  }
})
