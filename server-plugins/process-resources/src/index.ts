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

import card, { Card } from '@hcengineering/card'
import core, {
  ArrOf,
  Doc,
  generateId,
  getObjectValue,
  Ref,
  RefTo,
  SortingOrder,
  Timestamp,
  Tx,
  TxCreateDoc,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import { getEmbeddedLabel, getResource } from '@hcengineering/platform'
import process, {
  Execution,
  ExecutionError,
  MethodParams,
  parseContext,
  Process,
  ProcessToDo,
  SelectedContext,
  SelectedNested,
  SelectedRelation,
  State,
  Step
} from '@hcengineering/process'
import { TriggerControl } from '@hcengineering/server-core'
import serverProcess, { ExecuteResult } from '@hcengineering/server-process'
import time, { ToDoPriority } from '@hcengineering/time'
import { isError, parseError, ProcessError, processError } from './errors'

export async function OnStateRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) continue
    const removeTx = tx as TxRemoveDoc<State>
    if (!control.hierarchy.isDerived(removeTx.objectClass, process.class.State)) continue
    const removedState = control.removedMap.get(removeTx.objectId) as State
    if (removedState === undefined) continue
    const _process = await control.modelDb.findOne(process.class.Process, { _id: removedState.process })

    if (_process === undefined) continue
    const index = _process.states.indexOf(removedState._id)
    if (index === -1) continue
    const theLast = _process.states.length - 1 === index
    _process.states.splice(index, 1)
    res.push(
      control.txFactory.createTxUpdateDoc(_process._class, _process.space, _process._id, { states: _process.states })
    )
    if (theLast) {
      const lastState = (
        await control.findAll(control.ctx, process.class.State, { _id: _process.states[_process.states.length - 1] })
      )[0]
      if (lastState?.endAction != null) {
        res.push(
          control.txFactory.createTxUpdateDoc(lastState._class, lastState.space, lastState._id, {
            endAction: null
          })
        )
      }
    }
    const executions = await control.findAll(control.ctx, process.class.Execution, {
      currentState: removedState._id,
      process: removedState.process
    })
    for (const execution of executions) {
      const rollback = execution.rollback[removedState._id]
      if (rollback !== undefined) {
        res.push(...rollback)
      }
    }
  }
  return res
}

export async function OnProcessRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) continue
    const removeTx = tx as TxRemoveDoc<Process>
    if (!control.hierarchy.isDerived(removeTx.objectClass, process.class.Process)) continue
    const states = control.modelDb.findAllSync(process.class.State, { process: removeTx.objectId })
    const executions = await control.findAll(control.ctx, process.class.Execution, { process: removeTx.objectId })
    const todos = await control.findAll(control.ctx, process.class.ProcessToDo, {
      doneOn: null,
      execution: { $in: executions.map((it) => it._id) }
    })
    res.push(...executions.map((it) => control.txFactory.createTxRemoveDoc(it._class, it.space, it._id)))
    res.push(...todos.map((it) => control.txFactory.createTxRemoveDoc(it._class, it.space, it._id)))
    res.push(...states.map((it) => control.txFactory.createTxRemoveDoc(it._class, it.space, it._id)))
  }
  return res
}

export async function OnProcessToDoClose (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxUpdateDoc) continue
    const updateTx = tx as TxUpdateDoc<ProcessToDo>
    if (!control.hierarchy.isDerived(updateTx.objectClass, process.class.ProcessToDo)) continue
    if (updateTx.operations.doneOn == null) continue
    const todo = (
      await control.findAll(control.ctx, process.class.ProcessToDo, { _id: updateTx.objectId }, { limit: 1 })
    )[0]
    if (todo === undefined) continue
    const execution = (
      await control.findAll(
        control.ctx,
        process.class.Execution,
        { currentState: todo.state, _id: todo.execution },
        { limit: 1 }
      )
    )[0]
    if (execution === undefined) continue
    const _process = await control.modelDb.findOne(process.class.Process, { _id: execution.process })
    if (_process === undefined) continue
    const currentIndex = _process.states.findIndex((it) => it === execution.currentState)
    if (currentIndex === -1) continue
    const nextState = _process.states[currentIndex + 1]
    if (nextState === undefined) continue
    const states = await control.findAll(control.ctx, process.class.State, { _id: nextState })
    if (states.length === 0) continue
    const isDone = _process.states[currentIndex + 2] === undefined
    res.push(...(await changeState(execution, states[0], control, isDone)))
  }
  return res
}

async function executeAction<T extends Doc> (
  action: Step<T>,
  execution: Execution,
  control: TriggerControl
): Promise<ExecuteResult> {
  try {
    const method = control.modelDb.findObject(action.methodId)
    if (method === undefined) throw processError(process.error.MethodNotFound, { methodId: action.methodId }, {}, true)
    const impl = control.hierarchy.as(method, serverProcess.mixin.MethodImpl)
    if (impl === undefined) throw processError(process.error.MethodNotFound, { methodId: action.methodId }, {}, true)
    const params = await fillParams(action.params, execution, control)
    const f = await getResource(impl.func)
    const res = await f(params, execution, control)
    return res
  } catch (err) {
    if (err instanceof ProcessError) {
      if (err.shouldLog) {
        control.ctx.error(err.message, { props: err.props })
      }
      return parseError(err)
    } else {
      const errorId = generateId()
      control.ctx.error(err instanceof Error ? err.message : String(err), { errorId })
      return parseError(processError(process.error.InternalServerError, { errorId }))
    }
  }
}

async function fillValue (
  value: any,
  context: SelectedContext,
  control: TriggerControl,
  execution: Execution
): Promise<any> {
  for (const func of context.functions ?? []) {
    const transform = control.modelDb.findObject(func.func)
    if (transform === undefined) throw processError(process.error.MethodNotFound, { methodId: func.func }, {}, true)
    if (!control.hierarchy.hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: func.func }, {}, true)
    }
    const funcImpl = control.hierarchy.as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    value = await f(value, func.props, control, execution)
  }
  return value
}

async function getAttributeValue (
  control: TriggerControl,
  execution: Execution,
  context: SelectedContext
): Promise<any> {
  const cardValue = await control.findAll(control.ctx, card.class.Card, { _id: execution.card }, { limit: 1 })
  if (cardValue.length > 0) {
    const val = getObjectValue(context.key, cardValue[0])
    if (val == null) {
      const attr = control.hierarchy.findAttribute(cardValue[0]._class, context.key)
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

async function getNestedValue (
  control: TriggerControl,
  execution: Execution,
  context: SelectedNested
): Promise<any | ExecutionError> {
  const cardValue = await control.findAll(control.ctx, card.class.Card, { _id: execution.card }, { limit: 1 })
  if (cardValue.length === 0) throw processError(process.error.ObjectNotFound, { _id: execution.card }, {}, true)
  const attr = control.hierarchy.findAttribute(cardValue[0]._class, context.path)
  if (attr === undefined) throw processError(process.error.AttributeNotExists, { key: context.path })
  const nestedValue = getObjectValue(context.path, cardValue[0])
  if (nestedValue === undefined) throw processError(process.error.EmptyAttributeContextValue, {}, { attr: attr.label })
  const parentType = attr.type._class === core.class.ArrOf ? (attr.type as ArrOf<Doc>).of : attr.type
  const targetClass = parentType._class === core.class.RefTo ? (parentType as RefTo<Doc>).to : parentType._class
  const target = await control.findAll(control.ctx, targetClass, {
    _id: { $in: Array.isArray(nestedValue) ? nestedValue : [nestedValue] }
  })
  if (target.length === 0) throw processError(process.error.RelatedObjectNotFound, {}, { attr: attr.label })
  const nested = control.hierarchy.findAttribute(targetClass, context.key)
  if (context.sourceFunction !== undefined) {
    const transform = control.modelDb.findObject(context.sourceFunction)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    if (!control.hierarchy.hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    const funcImpl = control.hierarchy.as(transform, serverProcess.mixin.FuncImpl)
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
  control: TriggerControl,
  execution: Execution,
  context: SelectedRelation
): Promise<any> {
  const assoc = control.modelDb.findObject(context.association)
  if (assoc === undefined) throw processError(process.error.RelationNotExists, {})
  const targetClass = context.direction === 'A' ? assoc.classA : assoc.classB
  const q = context.direction === 'A' ? { docB: execution.card } : { docA: execution.card }
  const relations = await control.findAll(control.ctx, core.class.Relation, { association: assoc._id, ...q })
  const name = context.direction === 'A' ? assoc.nameA : assoc.nameB
  if (relations.length === 0) throw processError(process.error.RelatedObjectNotFound, { attr: name })
  const ids = relations.map((it) => {
    return context.direction === 'A' ? it.docA : it.docB
  })
  const target = await control.findAll(control.ctx, targetClass, { _id: { $in: ids } })
  const attr = control.hierarchy.findAttribute(targetClass, context.key)
  if (target.length === 0) throw processError(process.error.RelatedObjectNotFound, { attr: name })
  if (context.sourceFunction !== undefined) {
    const transform = control.modelDb.findObject(context.sourceFunction)
    if (transform === undefined) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    if (!control.hierarchy.hasMixin(transform, serverProcess.mixin.FuncImpl)) {
      throw processError(process.error.MethodNotFound, { methodId: context.sourceFunction }, {}, true)
    }
    const funcImpl = control.hierarchy.as(transform, serverProcess.mixin.FuncImpl)
    const f = await getResource(funcImpl.func)
    const reduced = await f(target, {}, control, execution)
    const val = getObjectValue(context.key, reduced)
    if (val == null) {
      throw processError(
        process.error.EmptyRelatedObjectValue,
        { parent: name },
        { attr: attr?.label ?? getEmbeddedLabel(context.key) }
      )
    }
    return val
  }
  const val = getObjectValue(context.key, target[0])
  if (val == null) {
    throw processError(
      process.error.EmptyRelatedObjectValue,
      { parent: name },
      { attr: attr?.label ?? getEmbeddedLabel(context.key) }
    )
  }
  return val
}

async function fillParams<T extends Doc> (
  params: MethodParams<T>,
  execution: Execution,
  control: TriggerControl
): Promise<MethodParams<T>> {
  const res: MethodParams<T> = {}
  for (const key in params) {
    const value = (params as any)[key]
    const valueResult = await getContextValue(value, control, execution)
    ;(res as any)[key] = valueResult
  }
  return res
}

async function getContextValue (value: any, control: TriggerControl, execution: Execution): Promise<any> {
  const context = parseContext(value)
  if (context !== undefined) {
    let value: any | undefined
    try {
      if (context.type === 'attribute') {
        value = await getAttributeValue(control, execution, context)
      } else if (context.type === 'relation') {
        value = await getRelationValue(control, execution, context)
      } else if (context.type === 'nested') {
        value = await getNestedValue(control, execution, context)
      }
      return await fillValue(value, context, control, execution)
    } catch (err: any) {
      if (err instanceof ProcessError && context.fallbackValue !== undefined) {
        return await fillValue(context.fallbackValue, context, control, execution)
      }
      throw err
    }
  } else {
    return value
  }
}

async function changeState (
  execution: Execution,
  state: State,
  control: TriggerControl,
  isDone: boolean = false
): Promise<Tx[]> {
  const errors: ExecutionError[] = []
  const res: Tx[] = []
  const rollback: Tx[] = []
  for (const action of state.actions) {
    const actionResult = await executeAction(action, execution, control)
    if (isError(actionResult)) {
      errors.push(actionResult)
    } else {
      if (actionResult.rollback !== undefined) {
        rollback.push(...actionResult.rollback)
      }
      res.push(...actionResult.txes)
    }
  }
  if (state.endAction != null) {
    const actionResult = await executeAction(state.endAction, execution, control)
    if (isError(actionResult)) {
      errors.push(actionResult)
    } else {
      if (actionResult.rollback !== undefined) {
        rollback.push(...actionResult.rollback)
      }
      res.push(...actionResult.txes)
    }
  }

  if (errors.length === 0) {
    if (rollback.length > 0) {
      execution.rollback[state._id] = rollback
      res.push(
        control.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
          rollback: execution.rollback
        })
      )
    }
    res.push(
      control.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
        currentState: state._id,
        done: isDone
      })
    )
    return res
  } else {
    return [control.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, { error: errors })]
  }
}

export async function OnExecutionCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxCreateDoc) continue
    const createTx = tx as TxCreateDoc<Execution>
    if (!control.hierarchy.isDerived(createTx.objectClass, process.class.Execution)) continue
    const execution = TxProcessor.createDoc2Doc(createTx)
    const state = (
      await control.findAll(
        control.ctx,
        process.class.State,
        { process: execution.process },
        { sort: { rank: SortingOrder.Ascending }, limit: 1 }
      )
    )[0]
    if (state === undefined) continue

    res.push(...(await changeState(execution, state, control)))
  }
  return res
}

export async function OnProcessToDoRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) continue
    const removeTx = tx as TxRemoveDoc<ProcessToDo>
    if (!control.hierarchy.isDerived(removeTx.objectClass, process.class.ProcessToDo)) continue
    const removedTodo = control.removedMap.get(removeTx.objectId) as ProcessToDo
    if (removedTodo === undefined) continue
    const execution = (await control.findAll(control.ctx, process.class.Execution, { _id: removedTodo.execution }))[0]
    if (execution === undefined) continue
    if (execution.currentState !== removedTodo.state) continue
    const rollback = execution.rollback[removedTodo.state]
    if (rollback !== undefined) {
      for (const rollbackTx of rollback) {
        // skip already removed tx
        if (
          rollbackTx._class === core.class.TxRemoveDoc &&
          (rollbackTx as TxRemoveDoc<ProcessToDo>).objectId === removeTx.objectId
        ) {
          continue
        }
        res.push(rollbackTx)
      }
    }
  }
  return res
}

export async function CreateToDo (
  params: MethodParams<ProcessToDo>,
  execution: Execution,
  control: TriggerControl
): Promise<ExecuteResult | undefined> {
  if (params.user === undefined || params.state === undefined || params.title === undefined) return
  const res: Tx[] = []
  const rollback: Tx[] = []
  const id = generateId<ProcessToDo>()
  res.push(
    control.txFactory.createTxCreateDoc(
      process.class.ProcessToDo,
      time.space.ToDos,
      {
        attachedTo: execution.card,
        attachedToClass: card.class.Card,
        collection: 'todos',
        workslots: 0,
        execution: execution._id,
        state: params.state,
        title: params.title,
        user: params.user,
        description: params.description ?? '',
        dueDate: params.dueDate,
        priority: params.priority ?? ToDoPriority.NoPriority,
        visibility: 'public',
        rank: ''
      },
      id
    )
  )
  res.push(
    control.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
      assignee: params.user as any,
      currentToDo: id
    })
  )
  rollback.push(
    control.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
      assignee: execution.assignee,
      currentToDo: execution.currentToDo
    })
  )
  rollback.push(control.txFactory.createTxRemoveDoc(process.class.ProcessToDo, time.space.ToDos, id))
  return { txes: res, rollback }
}

export async function UpdateCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: TriggerControl
): Promise<ExecuteResult | undefined> {
  if (Object.keys(params).length === 0) return
  const target = (await control.findAll(control.ctx, card.class.Card, { _id: execution.card }, { limit: 1 }))[0]
  if (target === undefined) return
  const update: Record<string, any> = {}
  const prevValue: Record<string, any> = {}
  for (const key in params) {
    prevValue[key] = (target as any)[key]
    update[key] = (params as any)[key]
  }
  const res: Tx[] = [control.txFactory.createTxUpdateDoc(target._class, target.space, target._id, update)]
  const rollback: Tx[] = [control.txFactory.createTxUpdateDoc(target._class, target.space, target._id, prevValue)]
  return { txes: res, rollback }
}

export async function RunSubProcess (
  params: MethodParams<Process>,
  execution: Execution,
  control: TriggerControl
): Promise<ExecuteResult | undefined> {
  if (params._id === undefined) return
  const res: Tx[] = []
  res.push(
    control.txFactory.createTxCreateDoc(process.class.Execution, core.space.Workspace, {
      process: params._id as Ref<Process>,
      currentState: null,
      currentToDo: null,
      card: execution.card,
      done: false,
      rollback: {},
      assignee: null
    })
  )
  return { txes: res, rollback: undefined }
}

export function FirstValue (value: Doc[]): Doc {
  if (!Array.isArray(value)) return value
  return value[0]
}

export function LastValue (value: Doc[]): Doc {
  if (!Array.isArray(value)) return value
  return value[value.length - 1]
}

export function Random (value: Doc[]): Doc {
  if (!Array.isArray(value)) return value
  return value[Math.floor(Math.random() * value.length)]
}

export function UpperCase (value: string): string {
  if (typeof value !== 'string') return value
  return value.toUpperCase()
}

export function LowerCase (value: string): string {
  if (typeof value !== 'string') return value
  return value.toLowerCase()
}

export function Trim (value: string): string {
  if (typeof value !== 'string') return value
  return value.trim()
}

export async function Add (
  value: number,
  props: Record<string, any>,
  control: TriggerControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.offset)
  if (context !== undefined) {
    if (context.type === 'attribute') {
      const offset = await getAttributeValue(control, execution, context)
      return value + offset
    }
  } else if (typeof value === 'number') {
    return value + props.offset
  }
  return value
}

export async function Subtract (
  value: number,
  props: Record<string, any>,
  control: TriggerControl,
  execution: Execution
): Promise<number> {
  const context = parseContext(props.offset)
  if (context !== undefined) {
    if (context.type === 'attribute') {
      const offset = await getAttributeValue(control, execution, context)
      return value - offset
    }
  } else if (typeof value === 'number') {
    return value - props.offset
  }
  return value
}

export function Offset (val: Timestamp, props: Record<string, any>): Timestamp {
  if (typeof val !== 'number') return val
  const value = new Date(val)
  const offset = props.offset * (props.direction === 'after' ? 1 : -1)
  switch (props.offsetType) {
    case 'days':
      return value.setDate(value.getDate() + offset)
    case 'weeks':
      return value.setDate(value.getDate() + 7 * offset)
    case 'months':
      return value.setMonth(value.getMonth() + offset)
  }
  return val
}

export function FirstWorkingDayAfter (val: Timestamp): Timestamp {
  if (typeof val !== 'number') return val
  const value = new Date(val)
  const day = value.getUTCDay()
  if (day === 6 || day === 0) {
    const date = value.getDate() + (day === 6 ? 2 : 1)
    const res = value.setDate(date)
    return res
  }
  return val
}

export async function OnCardCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxCreateDoc) continue
    const createTx = tx as TxCreateDoc<Card>
    if (!control.hierarchy.isDerived(createTx.objectClass, card.class.Card)) continue
    const ancestors = control.hierarchy
      .getAncestors(createTx.objectClass)
      .filter((p) => control.hierarchy.isDerived(p, card.class.Card))

    const processes = control.modelDb.findAllSync(process.class.Process, {
      masterTag: { $in: ancestors },
      autoStart: true
    })
    for (const proc of processes) {
      res.push(
        control.txFactory.createTxCreateDoc(process.class.Execution, core.space.Workspace, {
          process: proc._id,
          currentState: null,
          card: createTx.objectId,
          done: false,
          rollback: {},
          currentToDo: null,
          assignee: null
        })
      )
    }
  }
  return res
}

export async function OnTagAdd (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxMixin) continue
    const mixinTx = tx as TxMixin<Card, Card>
    if (!control.hierarchy.isDerived(mixinTx.objectClass, card.class.Card)) continue
    if (Object.keys(mixinTx.attributes).length !== 0) continue

    const processes = control.modelDb.findAllSync(process.class.Process, { masterTag: mixinTx.mixin, autoStart: true })
    for (const proc of processes) {
      res.push(
        control.txFactory.createTxCreateDoc(process.class.Execution, core.space.Workspace, {
          process: proc._id,
          currentState: null,
          card: mixinTx.objectId,
          done: false,
          rollback: {},
          currentToDo: null,
          assignee: null
        })
      )
    }
  }
  return res
}

export async function OnExecutionContinue (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxUpdateDoc) continue
    const updateTx = tx as TxUpdateDoc<Execution>
    if (!control.hierarchy.isDerived(updateTx.objectClass, process.class.Execution)) continue
    if (updateTx.operations.error !== null) continue
    const execution = (
      await control.findAll(control.ctx, process.class.Execution, { _id: updateTx.objectId }, { limit: 1 })
    )[0]
    if (execution === undefined) continue
    const _process = await control.modelDb.findOne(process.class.Process, { _id: execution.process })
    if (_process === undefined) continue
    const currentIndex = _process.states.findIndex((it) => it === execution.currentState)
    const nextState = _process.states[currentIndex + 1]
    if (nextState === undefined) continue
    const states = await control.findAll(control.ctx, process.class.State, { _id: nextState })
    if (states.length === 0) continue
    const isDone = _process.states[currentIndex + 2] === undefined
    res.push(...(await changeState(execution, states[0], control, isDone)))
  }
  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  func: {
    RunSubProcess,
    CreateToDo,
    UpdateCard
  },
  transform: {
    FirstValue,
    LastValue,
    Random,
    UpperCase,
    LowerCase,
    Trim,
    Add,
    Subtract,
    Offset,
    FirstWorkingDayAfter
  },
  trigger: {
    OnCardCreate,
    OnTagAdd,
    OnExecutionCreate,
    OnStateRemove,
    OnProcessRemove,
    OnProcessToDoClose,
    OnProcessToDoRemove,
    OnExecutionContinue
  }
})
