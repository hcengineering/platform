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
import core, {
  ArrOf,
  Doc,
  DocumentUpdate,
  generateId,
  Ref,
  RefTo,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxMixin,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc
} from '@hcengineering/core'
import process, {
  ContextId,
  Execution,
  Method,
  parseContext,
  Process,
  ProcessContext,
  ProcessToDo,
  SelectedExecutionContext,
  State,
  Step,
  Transition,
  isUpdateTx,
  ProcessCustomEvent,
  ApproveRequest,
  ExecutionStatus,
  Trigger
} from '@hcengineering/process'
import { QueueTopic, TriggerControl } from '@hcengineering/server-core'
import { ProcessMessage } from '@hcengineering/server-process'
import {
  Absolute,
  Add,
  All,
  Append,
  Ceil,
  CurrentDate,
  CurrentUser,
  Cut,
  Divide,
  FirstValue,
  FirstWorkingDayAfter,
  Floor,
  Insert,
  LastValue,
  LowerCase,
  Modulo,
  Multiply,
  Offset,
  Power,
  Sqrt,
  Prepend,
  Random,
  Remove,
  RemoveFirst,
  RemoveLast,
  Replace,
  ReplaceAll,
  RoleContext,
  Round,
  Split,
  Subtract,
  Trim,
  UpperCase,
  EmptyArray,
  ExecutionInitiator,
  ExecutionStarted,
  FirstMatchValue,
  Filter
} from './transform'
import {
  RunSubProcess,
  CancelSubProcess,
  CreateToDo,
  UpdateCard,
  CreateCard,
  AddRelation,
  AddTag,
  CheckToDoDone,
  CheckToDoCancelled,
  MatchCardCheck,
  CheckSubProcessesDone,
  CheckSubProcessMatch,
  CheckTime,
  FieldChangedCheck,
  EventCheck,
  RequestApproval,
  ApproveRequestApproved,
  ApproveRequestRejected,
  CancelToDo,
  LockCard,
  LockSection,
  UnlockCard,
  UnlockSection,
  LockField,
  UnlockField
} from './functions'
import { FieldChangedRollback, ToDoCancellRollback, ToDoCloseRollback } from './rollback'

async function putEventToQueue (value: Omit<ProcessMessage, 'account'>, control: TriggerControl): Promise<void> {
  if (control.queue === undefined) return
  const producer = control.queue.getProducer<ProcessMessage>(control.ctx.newChild('queue', {}), QueueTopic.Process)

  try {
    await producer.send(control.ctx, control.workspace.uuid, [
      {
        ...value,
        account: control.txFactory.account
      }
    ])
  } catch (err) {
    control.ctx.error('Could not queue process event', { err, value })
  }
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
    const events: Ref<Trigger>[] = [process.trigger.OnToDoClose]
    if (todo._class === process.class.ApproveRequest) {
      const request = todo as ApproveRequest
      if (request.approved === true) {
        events.push(process.trigger.OnApproveRequestApproved)
      } else if (request.approved === false) {
        events.push(process.trigger.OnApproveRequestRejected)
      }
    }
    await putEventToQueue(
      {
        event: events,
        execution: todo.execution,
        createdOn: tx.modifiedOn,
        _id: tx._id,
        context: {
          todo
        }
      },
      control
    )
    if (todo._class === process.class.ApproveRequest) {
      const request = todo as ApproveRequest
      if (request.approved === false) {
        // remove all other approve requests for this execution
        const toRemove = await control.findAll(control.ctx, process.class.ApproveRequest, {
          group: request.group,
          doneOn: null
        })
        for (const req of toRemove) {
          res.push(control.txFactory.createTxRemoveDoc(req._class, req.space, req._id))
        }
      }
    }
  }
  return res
}

export async function OnCustomEvent (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    if (tx._class !== core.class.TxCreateDoc) continue
    const createTx = tx as TxCreateDoc<ProcessCustomEvent>
    if (!control.hierarchy.isDerived(createTx.objectClass, process.class.ProcessCustomEvent)) continue
    const customEvent = TxProcessor.createDoc2Doc(createTx)
    const card = await control.findAll(control.ctx, cardPlugin.class.Card, { _id: customEvent.card }, { limit: 1 })
    if (card.length === 0) continue
    await putEventToQueue(
      {
        event: [process.trigger.OnEvent],
        execution: customEvent.execution,
        createdOn: tx.modifiedOn,
        card: customEvent.card,
        _id: tx._id,
        context: {
          eventType: customEvent.eventType,
          card
        }
      },
      control
    )
  }
  return []
}

export async function OnExecutionCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    if (tx._class !== core.class.TxCreateDoc) continue
    const createTx = tx as TxCreateDoc<Execution>
    if (!control.hierarchy.isDerived(createTx.objectClass, process.class.Execution)) continue
    const execution = TxProcessor.createDoc2Doc(createTx)
    await putEventToQueue(
      {
        event: [process.trigger.OnExecutionStart],
        execution: execution._id,
        createdOn: tx.modifiedOn,
        _id: tx._id,
        context: {}
      },
      control
    )
  }
  return []
}

export async function OnProcessToDoRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) continue
    const removeTx = tx as TxRemoveDoc<ProcessToDo>
    if (!control.hierarchy.isDerived(removeTx.objectClass, process.class.ProcessToDo)) continue
    if (removeTx.space === core.space.DerivedTx) continue
    const removedTodo = control.removedMap.get(removeTx.objectId) as ProcessToDo
    if (removedTodo === undefined) continue
    await putEventToQueue(
      {
        event: [process.trigger.OnToDoRemove],
        execution: removedTodo.execution,
        createdOn: tx.modifiedOn,
        _id: tx._id,
        context: {
          todo: removedTodo
        }
      },
      control
    )
  }
  return []
}

export async function OnExecutionContinue (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    if (tx._class !== core.class.TxUpdateDoc) continue
    if (tx.space !== core.space.Tx) continue
    const updateTx = tx as TxUpdateDoc<Execution>
    if (!control.hierarchy.isDerived(updateTx.objectClass, process.class.Execution)) continue
    const execution = (
      await control.findAll(control.ctx, process.class.Execution, { _id: updateTx.objectId }, { limit: 1 })
    )[0]
    if (execution === undefined) continue
    const error = execution.error
    if (error == null) continue
    const transition = execution.error?.[0].transition
    if (transition === undefined) continue
    await putEventToQueue(
      {
        event: [process.trigger.OnExecutionContinue],
        execution: execution._id,
        createdOn: tx.modifiedOn,
        _id: tx._id,
        context: {}
      },
      control
    )
  }
  return []
}

export async function OnProcessRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) continue
    const removeTx = tx as TxRemoveDoc<Process>
    if (!control.hierarchy.isDerived(removeTx.objectClass, process.class.Process)) continue
    const transition = control.modelDb.findAllSync(process.class.Transition, { process: removeTx.objectId })
    for (const tr of transition) {
      res.push(control.txFactory.createTxRemoveDoc(tr._class, tr.space, tr._id))
    }
    const states = control.modelDb.findAllSync(process.class.State, { process: removeTx.objectId })
    for (const st of states) {
      res.push(control.txFactory.createTxRemoveDoc(st._class, st.space, st._id))
    }
  }
  return res
}

export async function OnStateRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) continue
    const removeTx = tx as TxRemoveDoc<State>
    if (!control.hierarchy.isDerived(removeTx.objectClass, process.class.State)) continue
    const transitions = control.modelDb.findAllSync(process.class.Transition, { to: removeTx.objectId })
    for (const tr of transitions) {
      res.push(control.txFactory.createTxRemoveDoc(tr._class, tr.space, tr._id))
    }
    const state = control.removedMap.get(removeTx.objectId) as State
    if (state === undefined) continue
    const _process = control.modelDb.findObject(state.process)
    if (_process === undefined) continue
    const syncTx = await syncContext(control, _process)
    if (syncTx !== undefined) {
      res.push(syncTx)
    }
  }
  return res
}

export async function OnExecutionRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxRemoveDoc) continue
    const cudTx = tx as TxRemoveDoc<Execution>
    if (!control.hierarchy.isDerived(cudTx.objectClass, process.class.Execution)) continue
    const todos = await control.findAll(control.ctx, process.class.ProcessToDo, {
      execution: cudTx.objectId,
      doneOn: null
    })
    for (const todo of todos) {
      res.push(control.txFactory.createTxRemoveDoc(todo._class, todo.space, todo._id))
    }
  }
  return res
}

async function getExecutionReassignTxes (card: Card, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const cards = await control.findAll(control.ctx, cardPlugin.class.Card, { baseId: card.baseId })
  const ids = cards.map((p) => p._id).filter((p) => p !== card._id)
  const executions = await control.findAll(control.ctx, process.class.Execution, {
    card: { $in: ids },
    status: ExecutionStatus.Active
  })
  for (const execution of executions) {
    res.push(
      control.txFactory.createTxUpdateDoc(execution._class, execution.space, execution._id, {
        card: card._id
      })
    )
  }
  return res
}

async function reassignToDos (card: Card, ops: DocumentUpdate<Card>, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const todos = await control.findAll(control.ctx, process.class.ProcessToDo, {
    attachedTo: card._id,
    doneOn: null,
    field: { $ne: null }
  } as any)
  const handledGroups = new Set<string>()
  for (const todo of todos as any[]) {
    if (todo.field === undefined || !TxProcessor.hasUpdate(ops, todo.field)) continue

    if (todo._class === process.class.ApproveRequest) {
      const request = todo as ApproveRequest
      if (handledGroups.has(request.group)) continue
      handledGroups.add(request.group)

      const newUsers = (card[todo.field as keyof Card] as any[]) ?? []
      if (newUsers.length === 0) {
        continue
      }
      const currentRequests = await control.findAll(control.ctx, process.class.ApproveRequest, {
        group: request.group,
        doneOn: null
      })
      const currentUsers = currentRequests.map((r) => r.user)

      // Remove users not in new list
      for (const req of currentRequests) {
        if (!newUsers.includes(req.user)) {
          res.push(control.txFactory.createTxRemoveDoc(req._class, req.space, req._id))
        }
      }

      // Add users not in current list
      for (const user of newUsers) {
        if (!currentUsers.includes(user)) {
          const id = generateId<ApproveRequest>()
          const { _id, modifiedBy, modifiedOn, ...data } = request as any
          res.push(
            control.txFactory.createTxCreateDoc(
              request._class,
              request.space,
              {
                ...data,
                user
              },
              id
            )
          )
        }
      }
    } else {
      const newUser = card[todo.field as keyof Card]
      if (newUser === todo.user) continue

      if (newUser != null) {
        res.push(control.txFactory.createTxRemoveDoc(todo._class, todo.space, todo._id))

        const id = generateId<ProcessToDo>()
        const { _id, modifiedBy, modifiedOn, ...data } = todo
        res.push(
          control.txFactory.createTxCreateDoc(
            todo._class,
            todo.space,
            {
              ...data,
              user: newUser
            },
            id
          )
        )
      }
    }
  }
  return res
}

export async function OnCardCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxCreateDoc) continue
    const createTx = tx as TxCreateDoc<Card>
    if (!control.hierarchy.isDerived(createTx.objectClass, cardPlugin.class.Card)) continue
    const obj = TxProcessor.createDoc2Doc(createTx)

    if (obj.baseId !== obj._id) {
      const reassignTxes = await getExecutionReassignTxes(obj, control)
      res.push(...reassignTxes)
    }
  }
  return res
}

export async function OnTransition (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (!control.hierarchy.isDerived(tx._class, core.class.TxCUD)) continue
    const cudTx = tx as TxCUD<Transition>
    if (!control.hierarchy.isDerived(cudTx.objectClass, process.class.Transition)) continue
    const transition =
      (control.removedMap.get(cudTx.objectId) as Transition) ?? control.modelDb.findObject(cudTx.objectId)
    if (transition === undefined) continue
    const _process = control.modelDb.findObject(transition.process)
    if (_process === undefined) continue
    const syncTx = await syncContext(control, _process)
    if (syncTx !== undefined) {
      res.push(syncTx)
    }
  }
  return res
}

export async function OnCardUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  for (const tx of txes) {
    if (!control.hierarchy.isDerived(tx._class, core.class.TxCUD)) continue
    if (tx._class !== core.class.TxUpdateDoc && tx._class !== core.class.TxMixin) continue
    const cudTx = tx as TxUpdateDoc<Card> | TxMixin<Card, Card>
    if (!control.hierarchy.isDerived(cudTx.objectClass, cardPlugin.class.Card)) continue
    const card = await control.findAll(control.ctx, cardPlugin.class.Card, { _id: cudTx.objectId }, { limit: 1 })
    if (card.length === 0) continue
    const ops = isUpdateTx(cudTx) ? cudTx.operations : cudTx.attributes
    await putEventToQueue(
      {
        event: [process.trigger.OnCardUpdate, process.trigger.WhenFieldChanges],
        card: cudTx.objectId,
        createdOn: tx.modifiedOn,
        _id: tx._id,
        context: {
          card: card[0],
          operations: ops ?? {}
        }
      },
      control
    )
    const reassignTxes = await reassignToDos(card[0], ops ?? {}, control)
    res.push(...reassignTxes)
  }
  return res
}

function getName (current: ProcessContext | undefined, method: Method<Doc>, action: Step<Doc>): string {
  const nameField = method.createdContext?.nameField
  if (nameField !== undefined) {
    const name = action.params[nameField]
    if (name !== undefined && typeof name === 'string' && name !== '' && parseContext(name) === undefined) return name
  }
  return current?.name ?? ''
}

async function syncContext (control: TriggerControl, _process: Process): Promise<Tx | undefined> {
  const transitions = control.modelDb.findAllSync(process.class.Transition, { process: _process._id })
  const exists = new Set<ContextId>()
  let changed = false
  let index = 1
  for (const transition of transitions) {
    for (const action of transition.actions) {
      if (action.context != null) {
        exists.add(action.context._id)
        const method = control.modelDb.findObject(action.methodId)
        const current = _process.context[action.context._id]
        if (method?.createdContext != null) {
          changed = true
          const ctx: SelectedExecutionContext = {
            type: 'context',
            id: action.context._id,
            key: ''
          }
          _process.context[action.context._id] = {
            name: getName(current, method, action),
            _class: action.context._class ?? method.createdContext._class,
            action: action._id,
            index: index++,
            producer: transition._id,
            value: ctx
          }
        }
      }
      if (action.results != null) {
        for (const result of action.results) {
          exists.add(result._id)
          changed = true
          const ctx: SelectedExecutionContext = {
            type: 'context',
            id: result._id,
            key: ''
          }
          const parentType = result.type._class === core.class.ArrOf ? (result.type as ArrOf<Doc>).of : result.type
          const _class = parentType._class === core.class.RefTo ? (parentType as RefTo<Doc>).to : parentType._class
          _process.context[result._id] = {
            name: result.name,
            isResult: true,
            type: result.type,
            action: action._id,
            _class,
            index: index++,
            producer: transition._id,
            value: ctx
          }
        }
      }
    }
  }
  const newContext: Record<ContextId, ProcessContext> = {}
  for (const key of Object.keys(_process.context) as ContextId[]) {
    if (exists.has(key)) {
      newContext[key] = _process.context[key]
      continue
    }
    changed = true
  }
  if (changed) {
    return control.txFactory.createTxUpdateDoc(_process._class, _process.space, _process._id, {
      context: newContext
    })
  }
}

export * from './utils'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  func: {
    RunSubProcess,
    CancelSubProcess,
    CreateToDo,
    UpdateCard,
    CreateCard,
    AddRelation,
    AddTag,
    CheckToDoDone,
    CheckToDoCancelled,
    FieldChangedCheck,
    MatchCardCheck,
    CheckSubProcessesDone,
    CheckSubProcessMatch,
    CheckTime,
    EventCheck,
    RequestApproval,
    ApproveRequestApproved,
    ApproveRequestRejected,
    CancelToDo,
    LockCard,
    LockSection,
    UnlockCard,
    UnlockSection,
    LockField,
    UnlockField
  },
  transform: {
    CurrentDate,
    CurrentUser,
    FirstValue,
    LastValue,
    Random,
    All,
    UpperCase,
    LowerCase,
    Trim,
    Prepend,
    Append,
    Replace,
    ReplaceAll,
    Split,
    Cut,
    Add,
    Subtract,
    Multiply,
    Divide,
    Modulo,
    Power,
    Sqrt,
    Round,
    Absolute,
    Ceil,
    Floor,
    Offset,
    FirstWorkingDayAfter,
    RoleContext,
    Insert,
    Remove,
    RemoveFirst,
    RemoveLast,
    EmptyArray,
    ExecutionInitiator,
    ExecutionStarted,
    FirstMatchValue,
    Filter
  },
  rollbacks: {
    ToDoCloseRollback,
    ToDoCancellRollback,
    FieldChangedRollback
  },
  trigger: {
    OnProcessRemove,
    OnStateRemove,
    OnTransition,
    OnCardUpdate,
    OnExecutionCreate,
    OnProcessToDoClose,
    OnProcessToDoRemove,
    OnExecutionContinue,
    OnCustomEvent,
    OnExecutionRemove,
    OnCardCreate
  }
})
