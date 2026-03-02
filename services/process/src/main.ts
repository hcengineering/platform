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

import cardPlugin, { Card } from '@hcengineering/card'
import { CreateMessageEvent, MessageEventType } from '@hcengineering/communication-sdk-types'
import { ActivityProcess, ActivityUpdateType, MessageType } from '@hcengineering/communication-types'
import core, {
  Doc,
  generateId,
  getDiffUpdate,
  MeasureContext,
  OperationDomain,
  Ref,
  SortingOrder,
  Tx,
  TxCUD,
  TxMixin,
  TxOperations,
  TxProcessor,
  TxUpdateDoc,
  WorkspaceUuid
} from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { getResource } from '@hcengineering/platform'
import process, {
  Execution,
  ExecutionError,
  ExecutionLogAction,
  ExecutionStatus,
  isUpdateTx,
  MethodParams,
  parseContext,
  parseError,
  processError,
  ProcessError,
  ProcessToDo,
  State,
  Step,
  Transition,
  Trigger,
  UserResult
} from '@hcengineering/process'
import { QueueTopic } from '@hcengineering/server-core'
import serverProcess, {
  ExecuteResult,
  MethodImpl,
  ProcessControl,
  ProcessMessage,
  TimeMachineMessage,
  TriggerImpl
} from '@hcengineering/server-process'
import { getContextValue } from '@hcengineering/server-process-resources'
import { createCollaboratorClient } from './collaborator'
import { isError } from './errors'
import { getClient, releaseClient, SERVICE_NAME } from './utils'
import config from './config'

const activeExecutions = new Set<Ref<Execution>>()
const processedMessages = new Map<string, number>()
const MAX_PROCESSED_MESSAGES = 1000

export async function messageHandler (record: ProcessMessage, ws: WorkspaceUuid, ctx: MeasureContext): Promise<void> {
  if (record.account === core.account.ConfigUser) return
  if (record._id !== undefined) {
    if (processedMessages.has(record._id)) {
      ctx.info('Skipping duplicate message', { _id: record._id, ws, record })
      return
    }
    processedMessages.set(record._id, Date.now())
    if (processedMessages.size > MAX_PROCESSED_MESSAGES) {
      const first = processedMessages.keys().next().value
      if (first !== undefined) {
        processedMessages.delete(first)
      }
    }
  }
  try {
    const client = new TxOperations(await getClient(ws), record.account)
    try {
      const control: ProcessControl = {
        ctx,
        client,
        collaboratorFactory: () => createCollaboratorClient(ws),
        cache: new Map<string, any>(),
        messageContext: record.context,
        workspace: ws,
        modifiedBy: record.account,
        modifiedOn: record.createdOn
      }
      ctx.info('Processing event', { event: record.event, ws, record })
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
      await releaseClient(ws)
    }
  } catch (error) {
    ctx.error('Error processing event', { error, ws, record })
  }
}

function isActiveExecution (execution: Execution, trigger: Ref<Trigger>[]): boolean {
  if (execution.status !== ExecutionStatus.Active) return false
  if (execution.error != null && !trigger.includes(process.trigger.OnExecutionContinue)) return false
  return true
}

async function processBroadcast (control: ProcessControl, record: ProcessMessage): Promise<void> {
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    trigger: { $in: record.event }
  })
  for (const transition of transitions) {
    if (transition.from == null) continue
    const executions = await control.client.findAll(process.class.Execution, {
      process: transition.process,
      currentState: transition.from
    })
    for (const execution of executions) {
      if (isActiveExecution(execution, record.event)) {
        await execute(execution, transition, control)
      }
    }
  }
}

async function processCardExecutions (control: ProcessControl, record: ProcessMessage): Promise<void> {
  const transitions = control.client.getModel().findAllSync(process.class.Transition, {
    trigger: { $in: record.event }
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
  if (record.event.some((p) => p === process.trigger.OnCardUpdate || p === process.trigger.WhenFieldChanges)) {
    await updateTimers(control, record)
  }
}

async function findTransitions (
  control: ProcessControl,
  record: ProcessMessage,
  execution: Execution
): Promise<Transition | undefined> {
  if (record.event.includes(process.trigger.OnExecutionStart)) {
    const transitions = control.client.getModel().findAllSync(
      process.class.Transition,
      {
        process: execution.process,
        from: null,
        trigger: process.trigger.OnExecutionStart
      },
      { sort: { rank: SortingOrder.Ascending } }
    )
    return await pickTransition(control, execution, transitions, record.context)
  }
  if (record.event.includes(process.trigger.OnExecutionContinue)) {
    const transition = execution.error?.[0].transition
    if (transition === undefined) return
    const res = control.client.getModel().findAllSync(process.class.Transition, {
      _id: transition,
      process: execution.process
    })[0]
    if (res.from === execution.currentState || res.from === null) {
      return res
    }
  }
  const transitions = control.client.getModel().findAllSync(
    process.class.Transition,
    {
      from: execution.currentState,
      process: execution.process,
      trigger: { $in: record.event }
    },
    { sort: { rank: SortingOrder.Ascending } }
  )
  return await pickTransition(control, execution, transitions, record.context)
}

async function checkToDoResult (control: ProcessControl, record: ProcessMessage, execution: Execution): Promise<void> {
  if (!record.event.includes(process.trigger.OnToDoClose)) return
  const todo = record.context.todo as ProcessToDo
  if (todo === undefined) return
  if (todo.results == null) return
  const results = todo.results.filter((it) => it.key != null)
  if (results.length === 0) return
  const res = await executeResultSet(control, results, execution)
  if (!isError(res)) {
    for (const tx of res.txes) {
      const updateTx = tx as TxUpdateDoc<Doc>
      if (updateTx._class === core.class.TxUpdateDoc && updateTx.objectId === execution.card) {
        const updatedCard = TxProcessor.updateDoc2Doc(
          control.client.getHierarchy().clone(control.cache.get(execution.card)),
          updateTx
        )
        control.cache.set(execution.card, updatedCard)
      }
    }
    for (const tx of res.txes) {
      const timeout = setTimeout(() => {
        control.ctx.warn('TX HANG', tx)
      }, 30000)
      await control.client.tx(tx)
      clearTimeout(timeout)
    }
    if (res.rollback != null) {
      execution.rollback = execution.rollback.length > 30 ? execution.rollback.slice(-30) : execution.rollback
      await control.client.update(execution, { rollback: execution.rollback })
    }
  }
}

async function executeResultSet (
  control: ProcessControl,
  results: UserResult[],
  execution: Execution
): Promise<ExecuteResult> {
  try {
    const method = control.client.getModel().findObject(process.method.UpdateCard)
    if (method === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: process.method.UpdateCard }, {}, true)
    }
    const impl = control.client.getHierarchy().as(method, serverProcess.mixin.MethodImpl) as MethodImpl<any>
    if (impl === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: process.method.UpdateCard }, {}, true)
    }
    const params = {}
    for (const res of results) {
      if (res.key == null) continue
      ;(params as any)[res.key] = execution.context[res._id]
    }
    if (!control.cache.has(execution.card)) {
      const card = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
      if (card !== undefined) {
        control.cache.set(execution.card, card)
      }
    }
    const f = await getResource(impl.func)
    const res = await f(params, execution, control, undefined)
    return res
  } catch (err) {
    if (err instanceof ProcessError) {
      if (err.shouldLog) {
        control.ctx.error(err.message, { props: err.props })
      }
      return parseError(err, undefined)
    } else {
      const errorId = generateId()
      control.ctx.error(err instanceof Error ? err.message : String(err), { errorId })
      return parseError(processError(process.error.InternalServerError, { errorId }), undefined)
    }
  }
}

async function processExecution (control: ProcessControl, record: ProcessMessage, execution: Execution): Promise<void> {
  if (isActiveExecution(execution, record.event)) {
    await checkToDoResult(control, record, execution)
    const transition = await findTransitions(control, record, execution)
    if (transition !== undefined) {
      await execute(execution, transition, control)
      return
    } else {
      control.ctx.info('No transition found for event', {
        event: record.event,
        execution: execution._id,
        state: execution.currentState
      })
    }
  }
  if (isRollback(record)) {
    await rollback(control, execution)
  }
}

function isRollback (record: ProcessMessage): boolean {
  if (record.event.includes(process.trigger.OnEvent) && record.context.eventType === 'rollback') {
    return true
  }
  if (record.event.includes(process.trigger.OnToDoRemove) && record.context.todo?.withRollback === true) {
    return true
  }
  return false
}

async function rollback (control: ProcessControl, execution: Execution): Promise<void> {
  if (execution.rollback.length === 0) return
  const rollbackTxes = execution.rollback.pop() ?? []
  for (const tx of rollbackTxes) {
    const timeout = setTimeout(() => {
      control.ctx.warn('TX HANG', tx)
    }, 30000)
    await control.client.tx(tx)
    clearTimeout(timeout)
  }
  await control.client.update(execution, {
    rollback: execution.rollback
  })
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

  const fresh = await control.client.findOne(process.class.Execution, { _id: execution._id })
  if (fresh === undefined || fresh.currentState !== execution.currentState) {
    control.ctx.info('Skipping stale transition execution', {
      execution: execution._id,
      expectedState: execution.currentState,
      actualState: fresh?.currentState
    })
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

async function executeTransition (
  execution: Execution,
  _transition: Transition,
  control: ProcessControl
): Promise<void> {
  let nested = false
  let disableRollback = false
  let transition: Transition | undefined = _transition
  let currTransition: Transition = _transition
  while (transition !== undefined) {
    currTransition = transition
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
    disableRollback = disableRollback || (triggerImpl?.preventRollback ?? false)
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
    let card: Card | undefined =
      control.cache.get(execution.card) ??
      (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
    if (card !== undefined) {
      control.cache.set(execution.card, card)
    } else if (transition.trigger === process.trigger.OnExecutionStart) {
      for (let attempt = 1; attempt < 5; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        card = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
        if (card !== undefined) {
          control.cache.set(execution.card, card)
          break
        }
      }
    }
    if (card === undefined) {
      return
    }
    const context: Record<string, any> = {}
    for (const action of transition.actions) {
      const actionResult = await executeAction(action, transition._id, execution, control)
      if (isError(actionResult)) {
        errors.push(actionResult)
      } else {
        if (actionResult.rollback !== undefined && actionResult.rollback.length > 0) {
          rollback.push(...actionResult.rollback)
        }
        res.push(...actionResult.txes)
        for (const tx of actionResult.txes) {
          const updateTx = tx as TxUpdateDoc<Doc> | TxMixin<Doc, Doc>
          if (updateTx.objectId === execution.card) {
            if (isUpdateTx(updateTx)) {
              const updatedCard = TxProcessor.updateDoc2Doc(
                control.client.getHierarchy().clone(control.cache.get(execution.card)),
                updateTx
              )
              context.operations = { ...context.operations, ...updateTx.operations }
              control.cache.set(execution.card, updatedCard)
            } else if (updateTx._class === core.class.TxMixin) {
              const mixinTx = updateTx as TxMixin<Doc, Doc>
              const updatedCard = TxProcessor.updateMixin4Doc(
                control.client.getHierarchy().clone(control.cache.get(execution.card)),
                mixinTx
              )
              context.operations = { ...context.operations, ...mixinTx.attributes }
              control.cache.set(execution.card, updatedCard)
            }
          }
        }
      }
    }
    if (!disableRollback) {
      if (nested) {
        const last = execution.rollback.pop() ?? []
        execution.rollback.push([...last, ...rollback])
      } else {
        execution.rollback.push(rollback)
      }
    } else {
      execution.rollback = []
    }
    const executionUpdate = getDiffUpdate(execution, {
      currentState: state._id,
      status: isDone ? ExecutionStatus.Done : ExecutionStatus.Active,
      error: null
    })
    executionUpdate.context = execution.context
    executionUpdate.rollback = execution.rollback.length > 30 ? execution.rollback.slice(-30) : execution.rollback
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
      try {
        const apply = client.txFactory.createTxApplyIf(
          core.space.Tx,
          `${execution._id}_${transition._id}`,
          [{ _class: process.class.Execution, query: { _id: execution._id, currentState: execution.currentState } }],
          [],
          res as TxCUD<Doc>[],
          'process',
          true
        )
        const result = (await client.tx(apply)) as any
        if (result.success === false) {
          control.ctx.info('Transition apply failed (likely already processed)', {
            execution: execution._id,
            transition: transition._id
          })
          break
        }
        await sendEvent(control, execution, transition, card, isDone)
        TxProcessor.applyUpdate(execution, executionUpdate)
        if (execution.parentId !== undefined) {
          await checkParent(execution, control, isDone)
        }
        currTransition = transition
        transition = await checkNext(control, execution, context)
        nested = true
        if (transition === undefined) {
          await setNextTimers(control, execution)
        }
      } catch (err) {
        const errorId = generateId()
        control.ctx.error(err instanceof Error ? err.message : String(err), { errorId })
        const e = parseError(processError(process.error.InternalServerError, { errorId }), currTransition._id)
        await client.update(execution, { error: [e] })
        break
      }
    } else {
      await client.update(execution, { error: errors })
      break
    }
  }
}

async function sendEvent (
  control: ProcessControl,
  execution: Execution,
  transition: Transition,
  card: Card,
  isDone: boolean
): Promise<void> {
  const eventData: ActivityProcess = {
    type: ActivityUpdateType.Process,
    process: execution.process,
    action: isDone ? 'complete' : transition.from == null ? 'started' : 'transition',
    transitionTo: transition.to
  }
  const event: CreateMessageEvent = {
    type: MessageEventType.CreateMessage,
    messageType: MessageType.Activity,
    cardId: execution.card,
    cardType: card._class,
    extra: {
      action: 'update',
      update: eventData
    },
    content: await getActivityContent(control, eventData),
    socialId: control.modifiedBy,
    date: new Date(control.modifiedOn)
  }
  await control.client.domainRequest('communication' as OperationDomain, { event })
}

async function getActivityContent (control: ProcessControl, extra: ActivityProcess): Promise<string> {
  const process = control.client.getModel().findObject(extra.process)
  if (process === undefined) return ''

  if (extra.action === 'started') {
    return `Process ${process.name} started`
  }
  if (extra.action === 'complete' && extra.transitionTo != null) {
    const state = control.client.getModel().findObject(extra.transitionTo)
    if (state != null) {
      return `Process ${process.name} completed with state ${state.title}`
    }
  }
  if (extra.action === 'transition' && extra.transitionTo != null) {
    const state = control.client.getModel().findObject(extra.transitionTo)
    if (state != null) {
      return `Process ${process.name} moved to state ${state.title}`
    }
  }

  return ''
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
  try {
    const transitions = control.client.getModel().findAllSync(process.class.Transition, {
      from: execution.currentState,
      process: execution.process,
      trigger: process.trigger.OnTime
    })
    if (transitions.length === 0) return
    for (const transition of transitions) {
      await setTimer(control, execution, transition)
    }
  } catch (err) {
    control.ctx.error('Error setting next timers:', { error: err, execution: execution._id })
  }
}

async function setNextTimers (control: ProcessControl, execution: Execution): Promise<void> {
  try {
    await cleanTimers(control, execution)
    const transitions = control.client.getModel().findAllSync(process.class.Transition, {
      from: execution.currentState,
      process: execution.process,
      trigger: process.trigger.OnTime
    })
    for (const transition of transitions) {
      await setTimer(control, execution, transition)
    }
  } catch (err) {
    control.ctx.error('Error setting next timers:', { error: err, execution: execution._id })
  }
}

async function cleanTimers (control: ProcessControl, execution: Execution): Promise<void> {
  try {
    const queue = getPlatformQueue(SERVICE_NAME, config.QueueRegion)
    const producer = queue.getProducer<TimeMachineMessage>(control.ctx, QueueTopic.TimeMachine)
    await producer.send(control.ctx, control.workspace, [
      {
        type: 'cancel',
        id: `${execution._id}_%`
      }
    ])
  } catch (err) {
    console.error('Error cleaning timers:', err)
  }
}

async function setTimer (control: ProcessControl, execution: Execution, transition: Transition): Promise<void> {
  const filled = await fillParams(transition.triggerParams, execution, control)
  const targetDate: number = filled.value
  if (targetDate === undefined || typeof targetDate !== 'number' || targetDate === 0 || Number.isNaN(targetDate)) return
  try {
    const queue = getPlatformQueue(SERVICE_NAME, config.QueueRegion)
    const producer = queue.getProducer<TimeMachineMessage>(control.ctx, QueueTopic.TimeMachine)

    const data: ProcessMessage = {
      _id: `${execution._id}_${transition._id}`,
      account: core.account.System,
      event: [process.trigger.OnTime],
      createdOn: Date.now(),
      context: {},
      execution: execution._id
    }

    await producer.send(control.ctx, control.workspace, [
      {
        type: 'schedule',
        id: `${execution._id}_${transition._id}`,
        targetDate,
        topic: QueueTopic.Process,
        data
      }
    ])
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
    const res = await f(params, execution, control, action.results)
    if (!isError(res) && action.context?._id != null && res.context != null) {
      execution.context[action.context._id] =
        res.context.length === 1 ? res.context[0]._id : res.context.map((it) => it._id)
      for (const ctx of res.context) {
        control.cache.set(ctx._id, ctx.value)
      }
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

async function fillParams<T extends Doc> (
  params: MethodParams<T>,
  execution: Execution,
  control: ProcessControl
): Promise<MethodParams<T>> {
  if (!control.cache.has(execution.card)) {
    const card = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
    if (card !== undefined) {
      control.cache.set(execution.card, card)
    }
  }
  const res: MethodParams<T> = {}
  for (const key in params) {
    const value = control.client.getHierarchy().clone((params as any)[key])
    const valueResult = await getContextValue(value, control, execution)
    ;(res as any)[key] = valueResult
  }
  return res
}

async function checkParent (execution: Execution, control: ProcessControl, isDone: boolean): Promise<void> {
  try {
    const subProcesses = await control.client.findAll(process.class.Execution, {
      parentId: execution.parentId,
      status: ExecutionStatus.Active
    })
    const filtered = subProcesses.filter((it) => it._id !== execution._id)
    const parent = (await control.client.findAll(process.class.Execution, { _id: execution.parentId }))[0]
    if (parent === undefined) return
    const _process = control.client.getModel().findObject(parent.process)
    if (_process === undefined) return
    if (parent.status !== ExecutionStatus.Active) return
    const triggers: Ref<Trigger>[] = [process.trigger.OnSubProcessMatch]
    if (filtered.length === 0 && isDone) triggers.push(process.trigger.OnSubProcessesDone)
    const transitions = control.client.getModel().findAllSync(
      process.class.Transition,
      {
        from: parent.currentState,
        process: parent.process,
        trigger: { $in: triggers }
      },
      {
        sort: { rank: SortingOrder.Ascending }
      }
    )
    const transition = await pickTransition(control, parent, transitions, {})
    if (transition === undefined) return
    await executeTransition(parent, transition, control)
  } catch (err) {
    control.ctx.error('Error checking parent execution:', { error: err, execution: execution._id })
  }
}

async function checkNext (
  control: ProcessControl,
  execution: Execution,
  context: Record<string, any>
): Promise<Transition | undefined> {
  const autoTriggers = control.client.getModel().findAllSync(process.class.Trigger, { auto: true })
  const transitions = control.client.getModel().findAllSync(
    process.class.Transition,
    {
      from: execution.currentState,
      process: execution.process,
      trigger: { $in: autoTriggers.map((it) => it._id) }
    },
    { sort: { rank: SortingOrder.Ascending } }
  )
  if (transitions.length > 0) {
    const doc = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
    if (doc !== undefined) {
      control.cache.set(execution.card, doc)
      const transition = await pickTransition(control, execution, transitions, {
        ...context,
        card: doc
      })
      return transition
    }
  }
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
    const impl = control.client.getHierarchy().as(trigger, serverProcess.mixin.TriggerImpl)
    if (impl?.serverCheckFunc === undefined) return tr
    const filled = await fillParams(tr.triggerParams, execution, control)
    const checkFunc = await getResource(impl.serverCheckFunc)
    if (checkFunc === undefined) continue
    const res = await checkFunc(control, execution, filled, context)
    if (res) return tr
  }
}
