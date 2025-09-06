//
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
//

import cardPlugin from '@hcengineering/card'
import core, {
  ArrOf,
  Doc,
  generateId,
  getDiffUpdate,
  getObjectValue,
  MeasureContext,
  Ref,
  RefTo,
  Tx,
  TxProcessor,
  WorkspaceUuid
} from '@hcengineering/core'
import { getEmbeddedLabel, getResource } from '@hcengineering/platform'
import process, {
  Execution,
  ExecutionError,
  ExecutionLogAction,
  ExecutionStatus,
  MethodParams,
  parseContext,
  parseError,
  processError,
  ProcessError,
  SelectedContext,
  SelectedContextFunc,
  SelectedExecutionContext,
  SelectedNested,
  SelectedRelation,
  SelectedUserRequest,
  State,
  Step,
  Transition
} from '@hcengineering/process'
import serverProcess, {
  ExecuteResult,
  MethodImpl,
  ProcessControl,
  ProcessMessage,
  TriggerImpl
} from '@hcengineering/server-process'
import { isError } from './errors'
import { getClient, releaseClient } from './utils'
import { getTemporalClient } from './temporal'
import { Client as TemporalClient } from '@temporalio/client'
import config from './config'

const activeExecutions = new Set<Ref<Execution>>()

export async function messageHandler (record: ProcessMessage, ws: WorkspaceUuid, ctx: MeasureContext): Promise<void> {
  try {
    const client = await getClient(ws, record.account)
    try {
      const control: ProcessControl = {
        ctx,
        client,
        cache: new Map<string, any>(),
        messageContext: record.context
      }
      if (record.execution !== undefined) {
        const execution = await control.client.findOne(process.class.Execution, { _id: record.execution })
        if (execution !== undefined) {
          await processExecution(control, record, execution)
        }
      } else if (record.card !== undefined) {
        await processCardExecutions(control, record)
      } else {
        await processBroadcast(control, record)
      }
    } finally {
      await releaseClient(ws, record.account)
    }
  } catch (error) {
    ctx.error('Error processing event', { error, ws, record })
  }
}

async function processBroadcast (control: ProcessControl, record: ProcessMessage): Promise<void> {
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    trigger: record.event
  })
  for (const transition of transitions) {
    if (transition.from == null) continue
    const executions = await control.client.findAll(process.class.Execution, {
      process: transition.process,
      currentState: transition.from
    })
    for (const execution of executions) {
      await execute(execution, transition, control)
    }
  }
}

async function processCardExecutions (control: ProcessControl, record: ProcessMessage): Promise<void> {
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    trigger: record.event
  })
  const states = new Set<Ref<State>>()
  for (const transition of transitions) {
    if (transition.from !== null) {
      states.add(transition.from)
    }
  }
  if (states.size > 0) {
    const executions = await control.client.findAll(process.class.Execution, {
      card: record.card,
      status: ExecutionStatus.Active,
      currentState: { $in: Array.from(states) }
    })
    for (const execution of executions) {
      await processExecution(control, record, execution)
    }
  }

  // we should update timers, probably context value changed
  if (record.event === process.trigger.OnCardUpdate) {
    await updateTimers(control, record)
  }
}

async function findTransitions (
  control: ProcessControl,
  record: ProcessMessage,
  execution: Execution
): Promise<Transition | undefined> {
  if (record.event === process.trigger.OnExecutionStart) {
    const transitions = control.client.getModel().findAllSync(process.class.Transition, {
      process: execution.process,
      trigger: record.event
    })
    return await pickTransition(control, execution, transitions, record.context)
  }
  if (record.event === process.trigger.OnExecutionContinue) {
    const transition = execution.error?.[0].transition
    if (transition === undefined) return
    return control.client.getModel().findAllSync(process.class.Transition, {
      _id: transition,
      from: execution.currentState,
      process: execution.process
    })[0]
  }
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    from: execution.currentState,
    process: execution.process,
    trigger: record.event
  })
  return await pickTransition(control, execution, transitions, record.context)
}

async function processExecution (control: ProcessControl, record: ProcessMessage, execution: Execution): Promise<void> {
  const transition = await findTransitions(control, record, execution)
  if (transition !== undefined) {
    await execute(execution, transition, control)
  }
}

async function getTriggerRollback (triggger: TriggerImpl, control: ProcessControl): Promise<Tx | undefined> {
  if (triggger.rollbackFunc !== undefined) {
    const rollbackFunc = await getResource(triggger.rollbackFunc)
    if (rollbackFunc !== undefined) {
      try {
        return rollbackFunc(control.messageContext, control)
      } catch (err: any) {
        control.ctx.error('Error executing rollback function', { error: err, trigger: triggger._id })
      }
    }
  }
}

async function execute (execution: Execution, transition: Transition, control: ProcessControl): Promise<void> {
  if (activeExecutions.has(execution._id)) {
    control.ctx.info('Execution already in progress', { execution: execution._id, transition: transition._id })
    return
  }
  activeExecutions.add(execution._id)
  try {
    await executeTransition(execution, transition, control)
  } catch (err: any) {
    control.ctx.error('Error executing transition', {
      error: err,
      execution: execution._id,
      transition: transition._id
    })
  } finally {
    activeExecutions.delete(execution._id)
  }
}

async function executeTransition (execution: Execution, transition: Transition, control: ProcessControl): Promise<void> {
  let deep = control.cache.get(execution._id + 'transition') ?? 0
  deep++
  control.cache.set(execution._id + 'transition', deep)
  if (deep > 100) {
    const error = parseError(
      processError(process.error.TooDeepTransitionRecursion, undefined, undefined, true),
      transition._id
    )
    await control.client.update(execution, { error: [error] })
    return
  }
  const trigger = control.client.getModel().findObject(transition.trigger)
  if (trigger === undefined) return
  const rollback: Tx[] = []
  const triggerImpl = control.client.getHierarchy().as(trigger, serverProcess.mixin.TriggerImpl)
  const disableRollback = triggerImpl?.preventRollback ?? false
  const triggerRollback = await getTriggerRollback(triggerImpl, control)
  if (triggerRollback !== undefined) {
    rollback.push(triggerRollback)
  }
  const client = control.client
  const res: Tx[] = []
  const _process = client.getModel().findObject(execution.process)
  if (_process === undefined) return

  const state = client.getModel().findObject(transition.to)
  if (state === undefined) return
  const isDone =
    client.getModel().findAllSync(process.class.Transition, {
      from: transition.to,
      process: transition.process
    }).length === 0
  const errors: ExecutionError[] = []
  if (execution.currentState !== null) {
    rollback.push(
      client.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
        currentState: execution.currentState,
        status: execution.status
      })
    )
  } else {
    rollback.push(client.txFactory.createTxRemoveDoc(execution._class, execution.space, execution._id))
  }
  if (!control.cache.has(execution.card)) {
    const card = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
    if (card !== undefined) {
      control.cache.set(execution.card, card)
    }
  }
  for (const action of transition.actions) {
    const actionResult = await executeAction(action, transition._id, execution, control)
    if (isError(actionResult)) {
      errors.push(actionResult)
    } else {
      if (actionResult.rollback !== undefined) {
        rollback.push(...actionResult.rollback)
      }
      res.push(...actionResult.txes)
    }
  }
  if (!disableRollback) {
    execution.rollback.push(rollback)
  }
  const executionUpdate = getDiffUpdate(execution, {
    rollback: execution.rollback.length > 30 ? execution.rollback.slice(-30) : execution.rollback,
    context: execution.context,
    currentState: state._id,
    status: isDone ? ExecutionStatus.Done : ExecutionStatus.Active,
    error: null
  })
  executionUpdate.context = execution.context
  res.push(client.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, executionUpdate))
  res.push(
    client.txFactory.createTxCreateDoc(process.class.ExecutionLog, execution.space, {
      execution: execution._id,
      process: execution.process,
      card: execution.card,
      transition: transition._id,
      action: transition.from === null ? ExecutionLogAction.Started : ExecutionLogAction.Transition
    })
  )
  if (errors.length === 0) {
    for (const tx of res) {
      const timeout = setTimeout(() => {
        control.ctx.warn('TX HANG', tx)
      }, 30000)
      await client.tx(tx)
      clearTimeout(timeout)
    }
    if (isDone && execution.parentId !== undefined) {
      await checkParent(execution, control)
    }
    TxProcessor.applyUpdate(execution, executionUpdate)
    const next = await checkNext(control, execution)
    if (!next) {
      await setNextTimers(control, execution)
    }
  } else {
    await client.update(execution, { error: errors })
  }
}

async function updateTimers (control: ProcessControl, record: ProcessMessage): Promise<void> {
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    trigger: process.trigger.OnTime
  })
  const states = new Set<Ref<State>>()
  for (const transition of transitions) {
    const isContext = parseContext(transition.triggerParams?.value)
    // we shouldn't update timers for non-context values
    if (isContext !== undefined) {
      if (transition.from !== null) {
        states.add(transition.from)
      }
    }
  }
  if (states.size === 0) return
  const executions = await control.client.findAll(process.class.Execution, {
    card: record.card,
    status: ExecutionStatus.Active,
    currentState: { $in: Array.from(states) }
  })
  if (executions.length === 0) return
  if (record.card !== undefined && !control.cache.has(record.card)) {
    const card = await control.client.findOne(cardPlugin.class.Card, { _id: record.card })
    if (card !== undefined) {
      control.cache.set(record.card, card)
    }
  }
  for (const execution of executions) {
    try {
      await updateExecutionTimers(control, execution)
    } catch (err) {
      console.error('Error updating execution timers:', err)
    }
  }
}

async function updateExecutionTimers (control: ProcessControl, execution: Execution): Promise<void> {
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    from: execution.currentState,
    process: execution.process,
    trigger: process.trigger.OnTime
  })
  if (transitions.length === 0) return
  const temporalClient = await getTemporalClient()
  for (const transition of transitions) {
    await setTimer(control, execution, transition, temporalClient)
  }
}

async function setNextTimers (control: ProcessControl, execution: Execution): Promise<void> {
  const temporalClient = await getTemporalClient()
  await cleanTimers(execution, temporalClient)
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    from: execution.currentState,
    process: execution.process,
    trigger: process.trigger.OnTime
  })
  for (const transition of transitions) {
    await setTimer(control, execution, transition, temporalClient)
  }
}

async function cleanTimers (execution: Execution, temporalClient: TemporalClient): Promise<void> {
  try {
    const res = await temporalClient.workflowService.listWorkflowExecutions({
      namespace: config.TemporalNamespace,
      query: `WorkflowType="processTimeWorkflow" AND ExecutionStatus="Running" AND ProcessExecution="${execution._id}"`
    })

    for (const ex of res.executions) {
      try {
        await temporalClient.workflowService.terminateWorkflowExecution({
          workflowExecution: {
            workflowId: ex.execution?.workflowId,
            runId: ex.execution?.runId
          },
          reason: 'Outdated'
        })
      } catch (err) {
        console.error('Error terminating workflow execution:', err)
      }
    }
  } catch (err) {
    console.error('Error cleaning timers:', err)
  }
}

async function setTimer (
  control: ProcessControl,
  execution: Execution,
  transition: Transition,
  temporalClient: TemporalClient
): Promise<void> {
  const filled = await fillParams(transition.triggerParams, execution, control)
  const targetDate: number = filled.value
  if (targetDate === undefined || typeof targetDate !== 'number' || targetDate === 0 || Number.isNaN(targetDate)) return
  try {
    await temporalClient.workflow.signalWithStart('processTimeWorkflow', {
      taskQueue: 'process',
      signal: 'setDate',
      args: [targetDate, 'workspace', execution._id],
      signalArgs: [targetDate],
      workflowId: `${execution._id}_${transition._id}`,
      searchAttributes: {
        ProcessExecution: [execution._id]
      }
    })
  } catch (e) {
    console.error('Error setting timer:', e)
  }
}

async function executeAction<T extends Doc> (
  action: Step<T>,
  transition: Ref<Transition>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  try {
    const method = control.client.getModel().findObject(action.methodId)
    if (method === undefined) throw processError(process.error.MethodNotFound, { methodId: action.methodId }, {}, true)
    const impl = control.client.getHierarchy().as(method, serverProcess.mixin.MethodImpl) as MethodImpl<T>
    if (impl === undefined) throw processError(process.error.MethodNotFound, { methodId: action.methodId }, {}, true)
    const params = await fillParams(action.params, execution, control)
    const f = await getResource(impl.func)
    const res = await f(params, execution, control)
    if (!isError(res) && action.context?._id != null && res.context != null) {
      execution.context[action.context._id] = res.context
    }
    return res
  } catch (err) {
    if (err instanceof ProcessError) {
      if (err.shouldLog) {
        control.ctx.error(err.message, { props: err.props })
      }
      return parseError(err, transition)
    } else {
      const errorId = generateId()
      control.ctx.error(err instanceof Error ? err.message : String(err), { errorId })
      return parseError(processError(process.error.InternalServerError, { errorId }), transition)
    }
  }
}

async function fillValue (
  value: any,
  context: SelectedContext,
  control: ProcessControl,
  execution: Execution
): Promise<any> {
  for (const func of context.functions ?? []) {
    const transform = control.client.getModel().findObject(func.func)
    if (transform === undefined) throw processError(process.error.MethodNotFound, { methodId: func.func }, {}, true)
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: func.func }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    value = await f(value, func.props, control, execution)
  }
  return value
}

async function getNestedValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedNested
): Promise<any | ExecutionError> {
  const card = control.cache.get(execution.card)
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card }, {}, true)
  const attr = control.client.getHierarchy().findAttribute(card._class, context.path)
  if (attr === undefined) throw processError(process.error.AttributeNotExists, { key: context.path })
  const nestedValue = getObjectValue(context.path, card)
  if (nestedValue === undefined) throw processError(process.error.EmptyAttributeContextValue, {}, { attr: attr.label })
  const parentType = attr.type._class === core.class.ArrOf ? (attr.type as ArrOf<Doc>).of : attr.type
  const targetClass = parentType._class === core.class.RefTo ? (parentType as RefTo<Doc>).to : parentType._class
  const target = await control.client.findAll(targetClass, {
    _id: { $in: Array.isArray(nestedValue) ? nestedValue : [nestedValue] }
  })
  if (target.length === 0) throw processError(process.error.RelatedObjectNotFound, {}, { attr: attr.label })
  const nested = control.client.getHierarchy().findAttribute(targetClass, context.key)
  if (context.sourceFunction !== undefined) {
    const transform = control.client.getModel().findObject(context.sourceFunction)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    const reduced = await f(target, {}, control, execution)
    const val = getObjectValue(context.key, reduced)
    if (val == null) {
      throw processError(
        process.error.EmptyRelatedObjectValue,
        {},
        { parent: attr.label, attr: nested?.label ?? getEmbeddedLabel(context.key) }
      )
    }
    return val
  }
  const val = getObjectValue(context.key, target[0])
  if (val == null) {
    throw processError(
      process.error.EmptyRelatedObjectValue,
      {},
      { parent: attr.label, attr: nested?.label ?? getEmbeddedLabel(context.key) }
    )
  }
  return val
}

async function getRelationValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedRelation
): Promise<any> {
  const assoc = control.client.getModel().findObject(context.association)
  if (assoc === undefined) throw processError(process.error.RelationNotExists, {})
  const targetClass = context.direction === 'A' ? assoc.classA : assoc.classB
  const q = context.direction === 'A' ? { docB: execution.card } : { docA: execution.card }
  const relations = await control.client.findAll(core.class.Relation, { association: assoc._id, ...q })
  const name = context.direction === 'A' ? assoc.nameA : assoc.nameB
  if (relations.length === 0) throw processError(process.error.RelatedObjectNotFound, { attr: name })
  const ids = relations.map((it) => {
    return context.direction === 'A' ? it.docA : it.docB
  })
  const target = await control.client.findAll(targetClass, { _id: { $in: ids } })
  if (target.length === 0) throw processError(process.error.RelatedObjectNotFound, { attr: context.name })
  const attr = context.key !== '' ? control.client.getHierarchy().findAttribute(targetClass, context.key) : undefined
  if (context.sourceFunction !== undefined) {
    const transform = control.client.getModel().findObject(context.sourceFunction)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    const reduced = await f(target, {}, control, execution)
    const val = Array.isArray(reduced)
      ? reduced.map((v) => getObjectValue(context.key, v))
      : getObjectValue(context.key, reduced)
    if (val == null) {
      throw processError(
        process.error.EmptyRelatedObjectValue,
        { parent: name },
        { attr: attr?.label ?? getEmbeddedLabel(context.name) }
      )
    }
    return val
  }
  const val =
    Array.isArray(target) && target.length > 1
      ? target.map((v) => getObjectValue(context.key, v))
      : getObjectValue(context.key, target[0])
  if (val == null) {
    throw processError(
      process.error.EmptyRelatedObjectValue,
      { parent: name },
      { attr: attr?.label ?? getEmbeddedLabel(context.name) }
    )
  }
  return val
}

async function fillParams<T extends Doc> (
  params: MethodParams<T>,
  execution: Execution,
  control: ProcessControl
): Promise<MethodParams<T>> {
  const res: MethodParams<T> = {}
  for (const key in params) {
    const value = control.client.getHierarchy().clone((params as any)[key])
    const valueResult = await getContextValue(value, control, execution)
    ;(res as any)[key] = valueResult
  }
  return res
}

function getAttributeValue (control: ProcessControl, execution: Execution, context: SelectedContext): any {
  const card = control.cache.get(execution.card)
  if (card !== undefined) {
    const val = getObjectValue(context.key, card)
    if (val == null) {
      const attr = control.client.getHierarchy().findAttribute(card._class, context.key)
      throw processError(
        process.error.EmptyAttributeContextValue,
        {},
        { attr: attr?.label ?? getEmbeddedLabel(context.key) }
      )
    }
    return val
  } else {
    throw processError(process.error.ObjectNotFound, { _id: execution.card }, {}, true)
  }
}

async function getContextValue (value: any, control: ProcessControl, execution: Execution): Promise<any> {
  const context = parseContext(value)
  if (context !== undefined) {
    let value: any | undefined
    try {
      if (context.type === 'attribute') {
        value = getAttributeValue(control, execution, context)
      } else if (context.type === 'relation') {
        value = await getRelationValue(control, execution, context)
      } else if (context.type === 'nested') {
        value = await getNestedValue(control, execution, context)
      } else if (context.type === 'userRequest') {
        value = getUserRequestValue(control, execution, context)
      } else if (context.type === 'function') {
        value = await getFunctionValue(control, execution, context)
      } else if (context.type === 'context') {
        value = await getExecutionContextValue(control, execution, context)
      }
      return await fillValue(value, context, control, execution)
    } catch (err: any) {
      if (err instanceof ProcessError && context.fallbackValue !== undefined) {
        return await fillValue(context.fallbackValue, context, control, execution)
      }
      throw err
    }
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    for (const key in value) {
      value[key] = await getContextValue(value[key], control, execution)
    }
    return value
  } else {
    return value
  }
}

async function getFunctionValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedContextFunc
): Promise<any> {
  const func = control.client.getModel().findObject(context.func)
  if (func === undefined) throw processError(process.error.MethodNotFound, { methodId: context.func }, {}, true)
  const impl = control.client.getHierarchy().as(func, serverProcess.mixin.FuncImpl)
  if (impl === undefined) throw processError(process.error.MethodNotFound, { methodId: context.func }, {}, true)
  const f = await getResource(impl.func)
  const res = await f(null, context.props, control, execution)
  if (context.sourceFunction !== undefined) {
    const transform = control.client.getModel().findObject(context.sourceFunction)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    if (!control.client.getHierarchy().hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    const funcImpl = control.client.getHierarchy().as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    const val = await f(res, {}, control, execution)
    if (val == null) {
      throw processError(process.error.EmptyFunctionResult, {}, { func: func.label })
    }
    return val
  }
  if (res == null) {
    throw processError(process.error.EmptyFunctionResult, {}, { func: func.label })
  }
  return res
}

function getUserRequestValue (control: ProcessControl, execution: Execution, context: SelectedUserRequest): any {
  const userContext = execution.context[context.id]
  if (userContext !== undefined) return userContext
  const attr = control.client.getHierarchy().findAttribute(context._class, context.key)
  throw processError(
    process.error.UserRequestedValueNotProvided,
    {},
    { attr: attr?.label ?? getEmbeddedLabel(context.key) }
  )
}

async function getExecutionContextValue (
  control: ProcessControl,
  execution: Execution,
  context: SelectedExecutionContext
): Promise<any> {
  const userContext = execution.context[context.id]
  const _process = control.client.getModel().findObject(execution.process)
  const processContext = _process?.context?.[context.id]
  if (userContext !== undefined) {
    if (context.key === '' || context.key === '_id') return userContext
    if (processContext !== undefined) {
      const contextVal = await control.client.findOne(processContext?._class, { _id: userContext })
      if (contextVal !== undefined) {
        const val = getObjectValue(context.key, contextVal)
        return val
      }
    }
  }
  throw processError(process.error.ContextValueNotProvided, { name: processContext?.name ?? context.id })
}

async function checkParent (execution: Execution, control: ProcessControl): Promise<void> {
  const subProcesses = await control.client.findAll(process.class.Execution, {
    parentId: execution.parentId,
    status: ExecutionStatus.Active
  })
  const filtered = subProcesses.filter((it) => it._id !== execution._id)
  if (filtered.length !== 0) return
  const parent = (await control.client.findAll(process.class.Execution, { _id: execution.parentId }))[0]
  if (parent === undefined) return
  const _process = control.client.getModel().findObject(parent.process)
  if (_process === undefined) return
  if (parent.status !== ExecutionStatus.Active) return
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    from: parent.currentState,
    process: parent.process,
    trigger: process.trigger.OnSubProcessesDone
  })
  const transition = await pickTransition(control, execution, transitions, {})
  if (transition === undefined) return
  await executeTransition(parent, transition, control)
}

async function checkNext (control: ProcessControl, execution: Execution): Promise<boolean> {
  const autoTriggers = control.client.getModel().findAllSync(process.class.Trigger, { auto: true })
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    from: execution.currentState,
    process: execution.process,
    trigger: { $in: autoTriggers.map((it) => it._id) }
  })
  if (transitions.length > 0) {
    const doc = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
    if (doc !== undefined) {
      control.cache.set(execution.card, doc)
      const transition = await pickTransition(control, execution, transitions, {
        card: doc
      })
      if (transition !== undefined) {
        await executeTransition(execution, transition, control)
        return true
      }
    }
  }
  return false
}

export async function pickTransition (
  control: ProcessControl,
  execution: Execution,
  transitions: Transition[],
  context: Record<string, any>
): Promise<Transition | undefined> {
  for (const tr of transitions) {
    const trigger = control.client.getModel().findObject(tr.trigger)
    if (trigger === undefined) continue
    if (trigger.checkFunction === undefined) return tr
    const impl = control.client.getHierarchy().as(trigger, serverProcess.mixin.TriggerImpl)
    if (impl?.serverCheckFunc === undefined) return tr
    const filled = await fillParams(tr.triggerParams, execution, control)
    const checkFunc = await getResource(impl.serverCheckFunc)
    if (checkFunc === undefined) continue
    const res = await checkFunc(filled, context, control.client.getHierarchy())
    if (res) return tr
  }
}
