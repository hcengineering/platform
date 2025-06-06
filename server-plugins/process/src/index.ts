import { Doc, Mixin, Ref } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { CheckFunc, Method, ProcessFunction, Trigger } from '@hcengineering/process'
import { TriggerFunc } from '@hcengineering/server-core'
import { ExecuteFunc, TransformFunc } from './types'

export * from './types'

/**
 * @public
 */
export const serverProcessId = 'server-process' as Plugin

export interface TriggerImpl extends Trigger {
  serverCheckFunc?: Resource<CheckFunc>
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
  func: {
    RunSubProcess: '' as Resource<ExecuteFunc>,
    CreateToDo: '' as Resource<ExecuteFunc>,
    UpdateCard: '' as Resource<ExecuteFunc>,
    WaitSubProcess: '' as Resource<ExecuteFunc>,
    CheckToDo: '' as Resource<CheckFunc>
  },
  transform: {
    FirstValue: '' as Resource<TransformFunc>,
    LastValue: '' as Resource<TransformFunc>,
    Random: '' as Resource<TransformFunc>,
    UpperCase: '' as Resource<TransformFunc>,
    LowerCase: '' as Resource<TransformFunc>,
    Trim: '' as Resource<TransformFunc>,
    Add: '' as Resource<TransformFunc>,
    Subtract: '' as Resource<TransformFunc>,
    Offset: '' as Resource<TransformFunc>,
    FirstWorkingDayAfter: '' as Resource<TransformFunc>,
    RoleContext: '' as Resource<TransformFunc>
  },
  trigger: {
    OnStateActionsUpdate: '' as Resource<TriggerFunc>,
    OnTransition: '' as Resource<TriggerFunc>,
    OnProcessRemove: '' as Resource<TriggerFunc>,
    OnStateRemove: '' as Resource<TriggerFunc>,
    OnExecutionCreate: '' as Resource<TriggerFunc>,
    OnProcessToDoClose: '' as Resource<TriggerFunc>,
    OnProcessToDoRemove: '' as Resource<TriggerFunc>,
    OnExecutionContinue: '' as Resource<TriggerFunc>
  }
})
