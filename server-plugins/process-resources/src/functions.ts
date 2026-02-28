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
  Class,
  Data,
  Doc,
  DocumentUpdate,
  fillDefaults,
  findProperty,
  generateId,
  getObjectValue,
  makeDocCollabId,
  matchQuery,
  Ref,
  Relation,
  splitMixinUpdate,
  Tx,
  TxCreateDoc,
  TxProcessor,
  Type,
  TypeNumber
} from '@hcengineering/core'
import process, {
  ApproveRequest,
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

function checkResult (execution: Execution, results: Record<string, any> | undefined): boolean {
  if (results === undefined) return true
  for (const [key, value] of Object.entries(results)) {
    const res = findProperty([execution.context as any], key, value)
    if (res.length === 0) return false
  }
  return true
}

export async function CheckToDoDone (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  if (context.todo !== undefined) {
    const matched = context.todo._id === params._id
    return matched && checkResult(execution, params.result)
  } else {
    const todo = await control.client.findOne(process.class.ProcessToDo, { _id: params._id })
    if (todo === undefined) return false
    return todo.doneOn !== null && checkResult(execution, params.result)
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

export async function CheckSubProcessMatch (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  const { process: targetProcess, currentState } = params

  if (targetProcess === undefined || currentState === undefined) return false

  const subExecutions = await control.client.findAll(process.class.Execution, {
    parentId: execution._id,
    status: { $ne: ExecutionStatus.Cancelled },
    process: targetProcess
  })

  if (subExecutions.length === 0) return false

  const [predicate, value] = Object.entries(currentState)[0]

  const res = matchQuery(
    subExecutions,
    { currentState: { $in: value as any } },
    process.class.Execution,
    control.client.getHierarchy(),
    true
  )
  if (predicate === '$all') {
    return res.length === subExecutions.length
  } else if (predicate === '$in') {
    return res.length > 0
  } else if (predicate === '$nin') {
    return res.length === 0
  }
  return false
}

export function MatchCardCheck (
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

export function EventCheck (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  if (params.eventType === undefined) return false
  return context.eventType === params.eventType
}

export function FieldChangedCheck (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  if (context.card === undefined) return false
  const process = control.client.getModel().findObject(execution.process)
  if (process === undefined) return false
  if (context.operations === undefined) return false
  const operations = context.operations as DocumentUpdate<Doc>
  const target = Object.keys(params)[0]
  if (!TxProcessor.hasUpdate(operations, target)) return false
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
): Promise<ExecuteResult> {
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
  const exists = await control.client.findOne(core.class.Relation, { docA, docB, association })
  if (exists !== undefined) {
    return {
      txes: [],
      rollback: [],
      context: []
    }
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

function respectAttributeType (attrType: Type<any>, value: any): any {
  switch (attrType._class) {
    case core.class.TypeNumber: {
      const type = attrType as TypeNumber
      const { min, max, digits } = type
      let res = value
      if (min !== undefined && res < min) res = min
      if (max !== undefined && res > max) res = max
      if (digits !== undefined) {
        return Number(Number(res).toFixed(digits))
      }
      return res
    }
    default:
      return value
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
    const attr = hierarchy.findAttribute(_process.masterTag, key)
    if (attr === undefined) {
      update[key] = (params as any)[key]
    } else {
      update[key] = respectAttributeType(attr.type, (params as any)[key])
    }
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
  const tagId = _id as Ref<Tag>
  const res: Tx[] = []
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.process })
  // todo fill default for tag and set parent tags
  const tx = control.client.txFactory.createTxMixin(execution.card, _process.masterTag, execution.space, tagId, props)
  res.push(tx)
  const card = control.cache.get(execution.card)
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const cardWithMixin =
    card !== undefined ? TxProcessor.updateMixin4Doc(control.client.getHierarchy().clone(card), tx) : undefined
  if (control.client.getHierarchy().hasMixin(card, tagId)) {
    return {
      txes: res,
      rollback: [],
      context: [
        {
          _id: execution.card,
          value: cardWithMixin
        }
      ]
    }
  }

  const rollback: Tx[] = [
    control.client.txFactory.createTxUpdateDoc(_process.masterTag, execution.space, execution.card, {
      $unset: { [tagId]: true }
    })
  ]

  const processes = control.client.getModel().findAllSync(process.class.Process, { masterTag: tagId, autoStart: true })
  for (const proc of processes) {
    const [txes, rbTxes] = await createExecution(proc._id, execution.card, execution, control)
    res.push(...txes)
    rollback.push(...rbTxes)
  }

  return {
    txes: res,
    rollback,
    context: [
      {
        _id: execution.card,
        value: cardWithMixin
      }
    ]
  }
}

export async function CancelSubProcess (
  params: MethodParams<Execution>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const processId = params._id as Ref<Process>
  if (processId === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const target = control.client.getModel().findObject(processId)
  if (target === undefined) throw processError(process.error.ObjectNotFound, { _id: processId })
  const res: Tx[] = []
  const rollback: Tx[] = []
  const executions = await control.client.findAll(process.class.Execution, {
    card: execution.card,
    process: processId,
    status: ExecutionStatus.Active
  })
  for (const exec of executions) {
    res.push(
      control.client.txFactory.createTxUpdateDoc(process.class.Execution, execution.space, exec._id, {
        status: ExecutionStatus.Cancelled
      })
    )
    rollback.push(
      control.client.txFactory.createTxUpdateDoc(process.class.Execution, execution.space, exec._id, {
        status: ExecutionStatus.Active
      })
    )
  }

  return { txes: res, rollback, context: null }
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
  const rollback: Tx[] = []
  const initTransition = control.client
    .getModel()
    .findAllSync(process.class.Transition, { process: target._id, from: null })[0]
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

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const context = params.context ?? ({} as ExecutionContext)
    const _id = generateId<Execution>()
    const tx = control.client.txFactory.createTxCreateDoc(
      process.class.Execution,
      execution.space,
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

    rollback.push(control.client.txFactory.createTxRemoveDoc(process.class.Execution, core.space.Workspace, _id))

    res.push(tx)
    resultContext.push({
      _id,
      value: TxProcessor.createDoc2Doc(tx, true)
    })
  }
  return { txes: res, rollback, context: resultContext }
}

export async function RequestApproval (
  params: MethodParams<ApproveRequest>,
  execution: Execution,
  control: ProcessControl,
  results: UserResult[] | undefined
): Promise<ExecuteResult> {
  if (params.user === undefined || params.user.length === 0) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'user' })
  }
  const group = generateId()
  const res: TxCreateDoc<ApproveRequest>[] = []
  const rollback: Tx[] = []
  for (const user of Array.isArray(params.user) ? params.user : [params.user]) {
    const id = generateId<ApproveRequest>()
    const tx = control.client.txFactory.createTxCreateDoc(
      process.class.ApproveRequest,
      time.space.ToDos,
      {
        attachedTo: execution.card,
        attachedToClass: cardPlugin.class.Card,
        collection: 'todos',
        workslots: 0,
        execution: execution._id,
        title: 'Approve request',
        user,
        description: params.description ?? '',
        dueDate: params.dueDate,
        priority: params.priority ?? ToDoPriority.NoPriority,
        visibility: 'public',
        card: execution.card,
        doneOn: null,
        rank: '',
        withRollback: params.withRollback ?? false,
        results,
        group,
        actionType: params.actionType,
        field: (params as any).field
      },
      id
    )
    res.push(tx)
    rollback.push(control.client.txFactory.createTxRemoveDoc(process.class.ApproveRequest, time.space.ToDos, id))
  }
  return {
    txes: res,
    rollback,
    context: [
      {
        _id: group,
        value: res.map((tx) => TxProcessor.createDoc2Doc(tx, true))
      }
    ]
  }
}

export async function ApproveRequestApproved (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  const todo = await control.client.findAll(process.class.ApproveRequest, { group: params._id })
  return todo.every((t) => t.approved === true)
}

export async function ApproveRequestRejected (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  const todo = await control.client.findAll(process.class.ApproveRequest, { group: params._id })
  return todo.some((t) => t.approved === false)
}

export async function LockCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const res: Tx[] = []
  const rollback: Tx[] = []
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    readonly: true
  })
  res.push(tx)
  rollback.push(
    control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
      readonly: false
    })
  )
  return { txes: res, rollback, context: [] }
}

export async function LockSection (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (params._id === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const res: Tx[] = []
  const rollback: Tx[] = []
  const card = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const readonlySections = card.readonlySections ?? []
  const target = params._id as Ref<MasterTag>
  readonlySections.push(target)
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    readonlySections
  })
  res.push(tx)
  rollback.push(
    control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
      $pull: { readonlySections: target }
    })
  )
  return { txes: res, rollback, context: [] }
}

export async function UnlockCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const res: Tx[] = []
  const rollback: Tx[] = []
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    readonly: false
  })
  res.push(tx)
  rollback.push(
    control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
      readonly: true
    })
  )
  return { txes: res, rollback, context: [] }
}

export async function UnlockSection (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (params._id === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const res: Tx[] = []
  const rollback: Tx[] = []
  const card = await control.client.findOne(cardPlugin.class.Card, { _id: execution.card })
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const target = params._id as Ref<MasterTag>
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    $pull: { readonlySections: target }
  })
  res.push(tx)
  rollback.push(
    control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
      $push: { readonlySections: target }
    })
  )
  return { txes: res, rollback, context: [] }
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
      results,
      field: (params as any).field
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

export async function CancelToDo (
  params: MethodParams<ProcessToDo>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (params._id === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const todo = await control.client.findOne(process.class.ProcessToDo, { _id: params._id as any })
  if (todo === undefined) return { txes: [], rollback: [], context: null }
  if (todo.doneOn !== null) throw processError(process.error.ToDoAlreadyCompleted, { _id: params._id })
  const res: Tx[] = [control.client.txFactory.createTxRemoveDoc(todo._class, todo.space, todo._id)]
  const rollback: Tx[] = [
    control.client.txFactory.createTxCreateDoc(
      todo._class,
      todo.space,
      { ...todo },
      todo._id,
      todo.modifiedOn,
      todo.modifiedBy
    )
  ]
  return {
    txes: res,
    rollback,
    context: null
  }
}

async function getContent (
  control: ProcessControl,
  source: string,
  _id: Ref<Card>,
  _class: Ref<Class<Card>>
): Promise<string> {
  const collabClient = control.collaboratorFactory()
  const data = source.split('-')
  const sourceId = data[0]
  const sourceAttr = data[1]
  if (isEmpty(sourceId) || isEmpty(sourceAttr)) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'content' })
  }
  const sourceCard = await control.client.findOne(cardPlugin.class.Card, { _id: sourceId as Ref<Card> })
  if (sourceCard === undefined) {
    throw processError(process.error.ObjectNotFound, { _id: sourceId })
  }
  const markup = await collabClient.getMarkup(makeDocCollabId(sourceCard, sourceAttr))
  const ref = await collabClient.createMarkup(
    {
      objectClass: _class,
      objectId: _id,
      objectAttr: 'content'
    },
    markup
  )
  return ref
}

export async function CreateCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const { _class, title, content, ...attrs } = params
  for (const key in { _class, title }) {
    const val = (params as any)[key]
    if (isEmpty(val)) {
      throw processError(process.error.RequiredParamsNotProvided, { params: key })
    }
  }
  const masterTag = _class as Ref<MasterTag>
  const _id = generateId<Card>()
  const newContent =
    content !== undefined && !isEmpty(content) ? await getContent(control, content, _id, masterTag) : content
  const data = {
    title,
    ...attrs
  } as any
  if (newContent !== undefined) {
    data.content = newContent
  }
  const filledData = fillDefaults(control.client.getHierarchy(), data, masterTag)

  const tx = control.client.txFactory.createTxCreateDoc(masterTag, execution.space, filledData, _id)
  const res: Tx[] = [tx]
  const rollback: Tx[] = [control.client.txFactory.createTxRemoveDoc(masterTag, execution.space, _id)]

  const ancestors = control.client
    .getHierarchy()
    .getAncestors(masterTag)
    .filter((p) => control.client.getHierarchy().isDerived(p, cardPlugin.class.Card))

  const processes = control.client.getModel().findAllSync(process.class.Process, {
    masterTag: { $in: ancestors },
    autoStart: true
  })
  for (const proc of processes) {
    const [txes, rbTxes] = await createExecution(proc._id, _id, execution, control)
    res.push(...txes)
    rollback.push(...rbTxes)
  }
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

async function createExecution (
  proc: Ref<Process>,
  _id: Ref<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<[Tx[], Tx[]]> {
  const res: Tx[] = []
  const rollback: Tx[] = []
  const initTransition = control.client.getModel().findAllSync(process.class.Transition, {
    process: proc,
    from: null
  })[0]
  if (initTransition === undefined) return [res, rollback]
  const execId = generateId()
  const tx = control.client.txFactory.createTxCreateDoc(
    process.class.Execution,
    execution.space,
    {
      process: proc,
      currentState: initTransition.to,
      card: _id,
      rollback: [],
      context: {},
      status: ExecutionStatus.Active
    },
    execId
  )

  res.push(tx)
  rollback.push(control.client.txFactory.createTxRemoveDoc(process.class.Execution, execution.space, execId))
  return [res, rollback]
}
