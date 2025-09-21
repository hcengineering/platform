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

import cardPlugin, { Card, MasterTag, Tag } from '@hcengineering/card'
import core, {
  Association,
  checkMixinKey,
  Data,
  Doc,
  generateId,
  getObjectValue,
  matchQuery,
  Ref,
  Relation,
  splitMixinUpdate,
  Tx,
  TxProcessor
} from '@hcengineering/core'
import process, {
  Execution,
  ExecutionContext,
  ExecutionStatus,
  MethodParams,
  Process,
  processError,
  ProcessToDo,
  UserResult
} from '@hcengineering/process'
import { ExecuteResult, ProcessControl, SuccessExecutionContext } from '@hcengineering/server-process'
import time, { ToDoPriority } from '@hcengineering/time'

export async function CheckToDoDone (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  if (context.todo !== undefined) {
    return context.todo._id === params._id
  } else {
    const todo = await control.client.findOne(process.class.ProcessToDo, { _id: params._id })
    if (todo === undefined) return false
    return todo.doneOn !== null
  }
}

export async function CheckToDoCancelled (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  if (context.todo !== undefined) {
    return context.todo._id === params._id
  } else {
    const todo = await control.client.findOne(process.class.ProcessToDo, { _id: params._id })
    if (todo === undefined) return false
    return todo.doneOn === null
  }
}

export async function CheckSubProcessesDone (control: ProcessControl, execution: Execution): Promise<boolean> {
  const res = await control.client.findOne(process.class.Execution, {
    parentId: execution._id,
    status: ExecutionStatus.Active
  })
  return res === undefined
}

export function OnCardUpdateCheck (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  if (context.card === undefined) return false
  const process = control.client.getModel().findObject(execution.process)
  if (process === undefined) return false
  const res = matchQuery([context.card], params, process.masterTag, control.client.getHierarchy(), true)
  return res.length > 0
}

export function CheckTime (control: ProcessControl, execution: Execution, params: Record<string, any>): boolean {
  if (params.value === undefined) return false
  return params.value <= Date.now()
}

export async function AddRelation (
  params: MethodParams<Relation>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult | undefined> {
  const _id = generateId<Relation>()
  const association = params.association as Ref<Association>
  if (isEmpty(association)) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'association' })
  }
  if (isEmpty(params._id)) {
    throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  }
  if (isEmpty(params.direction)) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'direction' })
  }
  const targetId = params._id as Ref<Doc>
  const direction = params.direction as 'A' | 'B'
  const docA = direction === 'A' ? targetId : execution.card
  const docB = direction === 'A' ? execution.card : targetId
  const data: Data<Relation> = {
    association,
    docA,
    docB
  }
  const resTx = control.client.txFactory.createTxCreateDoc(core.class.Relation, core.space.Workspace, data, _id)
  const res: Tx[] = [resTx]
  const rollback: Tx[] = [control.client.txFactory.createTxRemoveDoc(core.class.Relation, core.space.Workspace, _id)]
  return {
    txes: res,
    rollback,
    context: [
      {
        _id,
        value: TxProcessor.createDoc2Doc(resTx, true)
      }
    ]
  }
}

export async function UpdateCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (Object.keys(params).length === 0) throw processError(process.error.RequiredParamsNotProvided, { params: 'ANY' })
  const target = control.cache.get(execution.card)
  if (target === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const hierarchy = control.client.getHierarchy()
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.process })
  const update: Record<string, any> = {}
  const prevValue: Record<string, any> = {}
  for (const key in params) {
    const prevKey = checkMixinKey(key, _process.masterTag, hierarchy)
    prevValue[key] = getObjectValue(prevKey, target)
    update[key] = (params as any)[key]
  }

  const res: Tx[] = []
  const rollback: Tx[] = []
  if (hierarchy.isMixin(_process.masterTag)) {
    const baseClass = hierarchy.getBaseClass(target._class)
    const byClass = splitMixinUpdate(control.client.getHierarchy(), update, _process.masterTag, baseClass)
    for (const it of byClass) {
      if (hierarchy.isMixin(it[0])) {
        res.push(control.client.txFactory.createTxMixin(target._id, baseClass, target.space, it[0], it[1]))
        const rollbackData: Record<string, any> = {}
        for (const key in it[1]) {
          rollbackData[key] = prevValue[key]
        }
        if (Object.keys(rollbackData).length > 0) {
          rollback.push(
            control.client.txFactory.createTxMixin(target._id, baseClass, target.space, it[0], rollbackData)
          )
        }
      } else {
        res.push(control.client.txFactory.createTxUpdateDoc(baseClass, target.space, target._id, it[1]))
        const rollbackData: Record<string, any> = {}
        for (const key in it[1]) {
          rollbackData[key] = prevValue[key]
        }
        if (Object.keys(rollbackData).length > 0) {
          rollback.push(control.client.txFactory.createTxUpdateDoc(baseClass, target.space, target._id, rollbackData))
        }
      }
    }
  } else {
    res.push(control.client.txFactory.createTxUpdateDoc(target._class, target.space, target._id, update))
    rollback.push(control.client.txFactory.createTxUpdateDoc(target._class, target.space, target._id, prevValue))
  }
  return { txes: res, rollback, context: null }
}

export async function AddTag (
  params: MethodParams<Tag>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const { _id, props } = params
  if (_id === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const res: Tx[] = []
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.process })
  const tx = control.client.txFactory.createTxMixin(
    execution.card,
    _process.masterTag,
    core.space.Workspace,
    _id as Ref<Tag>,
    props
  )
  res.push(tx)
  const card = control.cache.get(execution.card)
  const cardWithMixin =
    card !== undefined ? TxProcessor.updateMixin4Doc(control.client.getHierarchy().clone(card), tx) : undefined
  return {
    txes: res,
    rollback: undefined,
    context: [
      {
        _id: execution.card,
        value: cardWithMixin
      }
    ]
  }
}

export async function RunSubProcess (
  params: MethodParams<Execution>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (params._id === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const card = params.card ?? execution.card
  const processId = params._id as Ref<Process>
  const target = control.client.getModel().findObject(processId)
  if (target === undefined) throw processError(process.error.ObjectNotFound, { _id: processId })
  const res: Tx[] = []
  const resultContext: SuccessExecutionContext[] = []
  for (const _card of Array.isArray(card) ? card : [card]) {
    if (target.parallelExecutionForbidden === true) {
      const currentExecution = await control.client.findAll(process.class.Execution, {
        process: target._id,
        card: _card,
        done: false
      })
      if (currentExecution.length > 0) {
        // todo, show erro after merge another pr
        continue
      }
    }
    const initTransition = control.client
      .getModel()
      .findAllSync(process.class.Transition, { process: target._id, from: null })[0]
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const context = params.context ?? ({} as ExecutionContext)
    const _id = generateId<Execution>()
    const tx = control.client.txFactory.createTxCreateDoc(
      process.class.Execution,
      core.space.Workspace,
      {
        process: processId,
        currentState: initTransition.to,
        card: _card,
        context,
        status: ExecutionStatus.Active,
        rollback: [],
        parentId: execution._id
      },
      _id
    )

    res.push(tx)
    resultContext.push({
      _id,
      value: TxProcessor.createDoc2Doc(tx, true)
    })
  }
  return { txes: res, rollback: undefined, context: resultContext }
}

export async function CreateToDo (
  params: MethodParams<ProcessToDo>,
  execution: Execution,
  control: ProcessControl,
  results: UserResult[] | undefined
): Promise<ExecuteResult> {
  for (const key in { user: params.user, title: params.title }) {
    const val = (params as any)[key]
    if (isEmpty(val)) {
      throw processError(process.error.RequiredParamsNotProvided, { params: key })
    }
  }
  if (params.user === undefined || params.title === undefined) return { txes: [], rollback: [], context: null }
  const res: Tx[] = []
  const rollback: Tx[] = []
  const id = generateId<ProcessToDo>()
  const tx = control.client.txFactory.createTxCreateDoc(
    process.class.ProcessToDo,
    time.space.ToDos,
    {
      attachedTo: execution.card,
      attachedToClass: cardPlugin.class.Card,
      collection: 'todos',
      workslots: 0,
      execution: execution._id,
      title: params.title,
      user: params.user,
      description: params.description ?? '',
      dueDate: params.dueDate,
      priority: params.priority ?? ToDoPriority.NoPriority,
      visibility: 'public',
      doneOn: null,
      rank: '',
      withRollback: params.withRollback ?? false,
      results
    },
    id
  )
  res.push(tx)
  return {
    txes: res,
    rollback,
    context: [
      {
        _id: id,
        value: TxProcessor.createDoc2Doc(tx, true)
      }
    ]
  }
}

export async function CreateCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const { _class, title, ...attrs } = params
  for (const key in { _class, title }) {
    const val = (params as any)[key]
    if (isEmpty(val)) {
      throw processError(process.error.RequiredParamsNotProvided, { params: key })
    }
  }
  const _id = generateId<Card>()
  const data = {
    title,
    ...attrs
  } as any
  const tx = control.client.txFactory.createTxCreateDoc(_class as Ref<MasterTag>, execution.space, data, _id)
  const res: Tx[] = [tx]
  const rollback: Tx[] = [control.client.txFactory.createTxRemoveDoc(_class as Ref<MasterTag>, execution.space, _id)]
  return {
    txes: res,
    rollback,
    context: [
      {
        _id,
        value: TxProcessor.createDoc2Doc(tx, true)
      }
    ]
  }
}

function isEmpty (value: any): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}
