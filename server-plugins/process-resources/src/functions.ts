//
// Copyright © 2025 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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

import attachment, { type Attachment } from '@hcengineering/attachment'
import cardPlugin, { Card, MasterTag, Tag } from '@hcengineering/card'
import contact, { formatName, type Person } from '@hcengineering/contact'
import core, {
  Association,
  AnyAttribute,
  checkMixinKey,
  Class,
  Data,
  Doc,
  DocumentUpdate,
  type DocumentQuery,
  fillDefaults,
  findProperty,
  generateId,
  getGuestReadCollaboratorTargets,
  getObjectValue,
  isSpaceReadableByGuest,
  makeDocCollabId,
  matchQuery,
  Ref,
  Relation,
  Space,
  splitMixinUpdate,
  Tx,
  TxCreateDoc,
  TxProcessor,
  Type,
  TypeNumber
} from '@hcengineering/core'
import process, {
  ApproveRequest,
  EventButton,
  Execution,
  ExecutionContext,
  ExecutionStatus,
  MethodParams,
  Process,
  processError,
  ProcessToDo,
  UserResult,
  ContextId
} from '@hcengineering/process'
import { makeRank } from '@hcengineering/rank'
import { ExecuteResult, ProcessControl, SuccessExecutionContext } from '@hcengineering/server-process'
import { isEmptyMarkup } from '@hcengineering/text-core'
import time, { ToDoPriority } from '@hcengineering/time'
import { resolveAttributeId } from './utils'

function checkResult (execution: Execution, results: Record<string, any> | undefined): boolean {
  if (results === undefined) return true
  for (const [key, value] of Object.entries(results)) {
    const res = findProperty([execution.context as any], key, value)
    if (res.length === 0) return false
  }
  return true
}

/** Creates a user request with required attachments by default. */
export async function RequestAttachments (
  params: MethodParams<EventButton>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (isEmpty(params.user)) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'user' })
  }
  return await CreateAction({ ...params, requireAttachments: params.requireAttachments !== false }, execution, control)
}

export async function CreateAction (
  params: MethodParams<EventButton>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (isEmpty(params.title) || isEmpty(params.eventType)) {
    throw processError(process.error.RequiredParamsNotProvided, {
      params: isEmpty(params.title) ? 'title' : 'eventType'
    })
  }
  if (params.title === undefined || params.eventType === undefined) {
    return { txes: [], rollback: [], context: null }
  }

  const id = generateId<EventButton>()
  const tx = control.client.txFactory.createTxCreateDoc(
    process.class.EventButton,
    execution.space,
    {
      title: params.title,
      description: params.description ?? '',
      eventType: params.eventType,
      user: params.user,
      requireAttachments: params.requireAttachments,
      execution: execution._id,
      card: execution.card
    },
    id
  )

  return {
    txes: [tx],
    rollback: [control.client.txFactory.createTxRemoveDoc(process.class.EventButton, execution.space, id)],
    context: [{ _id: id, value: TxProcessor.createDoc2Doc(tx, true) }]
  }
}

export async function SetContext (
  params: MethodParams<Doc>,
  _execution: Execution,
  _control: ProcessControl,
  results: UserResult[] | undefined
): Promise<ExecuteResult> {
  if (results?.length !== 1 || results[0] === undefined) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'result' })
  }
  const result = results[0]
  if (params.value === undefined) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'value' })
  }

  return {
    txes: [],
    rollback: [],
    context: null,
    results: [{ _id: result._id, value: params.value }]
  }
}

/** Updates an initialized process result without creating another context definition. */
export async function UpdateContext (
  params: MethodParams<Doc>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (typeof params.contextId !== 'string' || params.contextId === '' || params.value === undefined) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'contextId, value' })
  }
  const contextId = params.contextId as ContextId
  const definition = control.client.getModel().findObject(execution.process)?.context[contextId]
  if (definition?.isResult !== true || definition.type === undefined) {
    throw processError(process.error.ContextValueNotProvided, { name: definition?.name ?? contextId })
  }
  if (!Object.prototype.hasOwnProperty.call(execution.context, contextId)) {
    throw processError(process.error.ContextValueNotProvided, { name: definition.name })
  }
  return {
    txes: [],
    rollback: [],
    context: null,
    results: [{ _id: contextId, value: params.value }]
  }
}

async function findProcessToDos (
  control: ProcessControl,
  execution: Execution,
  id: string,
  pendingOnly: boolean = false
): Promise<ProcessToDo[]> {
  const query: DocumentQuery<ProcessToDo> = { execution: execution._id }
  if (pendingOnly) query.doneOn = null
  // Top-level $or is not supported by the storage query API.
  const matches = await Promise.all([
    control.client.findAll(process.class.ProcessToDo, { ...query, _id: id as Ref<ProcessToDo> }),
    control.client.findAll(process.class.ProcessToDo, { ...query, group: id })
  ])
  return Array.from(new Map(matches.flat().map((todo) => [todo._id, todo])).values())
}

export async function CheckToDoDone (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  const eventTodo = context.todo as ProcessToDo | undefined
  if (eventTodo !== undefined && eventTodo._id !== params._id && eventTodo.group !== params._id) return false
  if (eventTodo !== undefined && eventTodo.group === undefined) return checkResult(execution, params.result)
  const todos = await findProcessToDos(control, execution, params._id)
  if (todos.length === 0) return false
  const completed =
    todos[0].completionMode === 'any'
      ? todos.some((todo) => todo.doneOn != null)
      : todos.every((todo) => todo.doneOn != null)
  return completed && (todos[0].completionMode === 'all' || checkResult(execution, params.result))
}

export async function CheckToDoCancelled (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  if (context.todo !== undefined) {
    return context.todo._id === params._id || context.todo.group === params._id
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
  let card = context.card
  if (card === undefined) return false
  const process = control.client.getModel().findObject(execution.process)
  if (process === undefined) return false

  const h = control.client.getHierarchy()
  if (params._class !== undefined) {
    if (typeof params._class !== 'string' || !h.isDerived(card._class, params._class as Ref<Class<Doc>>)) return false
  }
  if (h.isMixin(process.masterTag)) {
    card = h.as(card, process.masterTag)
  }

  const resolvedParams: Record<string, any> = {}
  for (const key in params) {
    if (key === '_class') continue
    resolvedParams[resolveAttributeId(process, key)] = params[key]
  }
  const markup = getMarkupParams(process, resolvedParams, control)

  for (const key of Object.keys(markup)) {
    if (isEmptyMarkup(card[key])) return false
  }

  const res = matchQuery([card], resolvedParams, process.masterTag, control.client.getHierarchy(), true)
  return res.length > 0
}

function getMarkupParams (process: Process, params: Record<string, any>, control: ProcessControl): Record<string, any> {
  const markup: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    const attr = control.client.getHierarchy().findAttribute(process.masterTag, key)
    if (attr?.type?._class === core.class.TypeMarkup) {
      markup[key] = value
    }
  }
  return markup
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

export function RelationChangedCheck (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  const relation = context.relation as Relation | undefined
  if (relation === undefined) return false
  if (params.mode !== undefined && params.mode !== context.relationChange) return false
  if (params.association !== undefined && params.association !== relation.association) return false

  switch (params.direction) {
    case 'A':
      return relation.docB === execution.card
    case 'B':
      return relation.docA === execution.card
    default:
      return relation.docA === execution.card || relation.docB === execution.card
  }
}

export function FieldChangedCheck (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  if (context.card === undefined) return false
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) return false
  if (context.operations === undefined) return false
  const operations = context.operations as DocumentUpdate<Doc>
  const target = Object.keys(params)[0]
  const h = control.client.getHierarchy()
  let card = context.card
  if (h.isMixin(_process.masterTag)) {
    card = h.as(card, _process.masterTag)
  }
  const realTarget = resolveAttributeId(_process, target)
  if (!TxProcessor.hasUpdate(operations, realTarget)) return false
  const resolvedParams = { [realTarget]: params[target] }
  const markup = getMarkupParams(_process, resolvedParams, control)
  for (const key of Object.keys(markup)) {
    if (isEmptyMarkup(card[key])) return false
  }

  const res = matchQuery([card], resolvedParams, _process.masterTag, control.client.getHierarchy(), true)
  return res.length > 0
}

function isRequiredValueFilled (value: any, attr: AnyAttribute): boolean {
  if (attr.type?._class === core.class.TypeMarkup) return !isEmptyMarkup(value)
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ''
}

export function RequiredFieldsFilledCheck (
  control: ProcessControl,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  let card = context.card
  if (card === undefined) return false
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) return false
  const hierarchy = control.client.getHierarchy()
  const attributes = Array.from(
    hierarchy.isMixin(_process.masterTag)
      ? hierarchy.getOwnAttributes(_process.masterTag).entries()
      : hierarchy.getAllAttributes(_process.masterTag, core.class.Doc).entries()
  ).filter(([, attr]) => attr.required === true && attr.hidden !== true)

  if (hierarchy.isMixin(_process.masterTag)) {
    card = hierarchy.as(card, _process.masterTag)
  }

  return attributes.every(([key, attr]) => isRequiredValueFilled(getObjectValue(key, card), attr))
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
  const targetIds = Array.isArray(params._id) ? params._id : [params._id]
  const direction = params.direction as 'A' | 'B'
  const res: Tx[] = []
  const rollback: Tx[] = []
  const context: SuccessExecutionContext[] = []
  for (const targetId of targetIds) {
    const docA = direction === 'A' ? targetId : execution.card
    const docB = direction === 'A' ? execution.card : targetId
    const data: Data<Relation> = {
      association,
      docA,
      docB
    }
    const exists = await control.client.findOne(core.class.Relation, { docA, docB, association })
    if (exists !== undefined) continue
    const _id = generateId<Relation>()
    const resTx = control.client.txFactory.createTxCreateDoc(core.class.Relation, core.space.Workspace, data, _id)
    res.push(resTx)
    rollback.push(control.client.txFactory.createTxRemoveDoc(core.class.Relation, core.space.Workspace, _id))
    context.push({
      _id,
      value: TxProcessor.createDoc2Doc(resTx, true)
    })
  }
  return {
    txes: res,
    rollback,
    context
  }
}

/** Removes selected relations of the current execution card and prepares their restoration. */
export async function RemoveRelation (
  params: MethodParams<Relation>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (typeof params.association !== 'string' || params.association === '') {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'association' })
  }
  if (params.direction !== 'A' && params.direction !== 'B') {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'direction' })
  }
  const targets: unknown[] = Array.isArray(params._id) ? params._id : [params._id]
  if (targets.some((id) => typeof id !== 'string' || id === '')) {
    throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  }
  const targetIds = [...new Set(targets as Array<Ref<Doc>>)]
  if (targetIds.length === 0) return { txes: [], rollback: [], context: null }
  const relations = await control.client.findAll(core.class.Relation, {
    association: params.association,
    ...(params.direction === 'A'
      ? { docA: { $in: targetIds }, docB: execution.card }
      : { docA: execution.card, docB: { $in: targetIds } })
  })
  const txes: Tx[] = []
  const rollback: Tx[] = []
  for (const relation of relations) {
    const { _id, _class, space, modifiedBy, modifiedOn, createdBy, createdOn, ...data } = relation
    txes.push(control.client.txFactory.createTxRemoveDoc(_class, space, _id))
    rollback.push(control.client.txFactory.createTxCreateDoc(_class, space, data, _id))
  }
  return { txes, rollback, context: null }
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
    const realKey = resolveAttributeId(_process, key)
    const prevKey = checkMixinKey(realKey, _process.masterTag, hierarchy)
    prevValue[realKey] = getObjectValue(prevKey, target)
    const attr = hierarchy.findAttribute(_process.masterTag, realKey)
    if (attr === undefined) {
      update[realKey] = (params as any)[key]
    } else {
      update[realKey] = respectAttributeType(attr.type, (params as any)[key])
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

export async function MakeVersionEffective (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const target: Card | undefined =
    (control.cache.get(execution.card) as Card | undefined) ??
    (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (target === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const tx = control.client.txFactory.createTxUpdateDoc<Card>(target._class, target.space, target._id, {
    isEffective: true
  })
  return { txes: [tx], rollback: undefined, context: [] }
}

async function getLatestCardVersion (execution: Execution, control: ProcessControl): Promise<Card> {
  const current: Card | undefined =
    (control.cache.get(execution.card) as Card | undefined) ??
    (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (current === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  if (current.isLatest === true) return current

  const latest = await control.client.findOne<Card>(current._class, {
    baseId: current.baseId ?? current._id,
    isLatest: true
  })
  if (latest === undefined) throw processError(process.error.ObjectNotFound, { _id: current.baseId ?? current._id })
  return latest
}

export async function CreateNewVersion (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const origin = await getLatestCardVersion(execution, control)
  const hierarchy = control.client.getHierarchy()
  const config = hierarchy.classHierarchyMixin(origin._class, core.mixin.VersionableClass)
  if (config?.enabled !== true) throw new Error('Versioning is not enabled for this class')
  if (origin.versionCreationDisabled === true) throw new Error('New version creation is currently disabled')

  const base = hierarchy.getBaseClass(origin._class)
  const targetId = generateId<Card>()
  const props: Partial<Data<Card>> = {}
  const propsRecord = props as Record<string, unknown>
  const attributes = hierarchy.getAllAttributes(base, core.class.Doc)
  const systemFields = new Set([
    '_class',
    '_id',
    'createdOn',
    'modifiedOn',
    'modifiedBy',
    'createdBy',
    'rank',
    'baseId',
    'version',
    'isLatest',
    'isEffective',
    'versionCreationDisabled',
    'readonly',
    'docCreatedBy'
  ])

  for (const [key, attribute] of attributes) {
    if (config.excludedProperties?.includes(key) === true || systemFields.has(key)) continue
    if (attribute.type._class === core.class.Collection) {
      propsRecord[key] = 0
    } else if (attribute.type._class !== core.class.TypeCollaborativeDoc) {
      propsRecord[key] = getObjectValue(key, origin)
    }
  }

  props.baseId = origin.baseId ?? origin._id
  props.docCreatedBy = origin.docCreatedBy ?? origin.createdBy ?? origin.modifiedBy
  props.isEffective = false
  props.versionCreationDisabled = false
  props.readonly = false
  props.rank = makeRank(origin.rank, undefined)

  if (config.excludedProperties?.includes('content') !== true) {
    const collabClient = control.collaboratorFactory()
    const markup = await collabClient.getMarkup(makeDocCollabId(origin, 'content'), origin.content)
    if (!isEmptyMarkup(markup)) {
      props.content = await collabClient.createMarkup(
        {
          objectClass: base,
          objectId: targetId,
          objectAttr: 'content'
        },
        markup
      )
    }
  }

  const [relationsA, relationsB, attachments] = await Promise.all([
    control.client.findAll(core.class.Relation, { docA: origin._id }),
    control.client.findAll(core.class.Relation, { docB: origin._id }),
    config.excludedProperties?.includes('attachments') === true
      ? Promise.resolve([] as Attachment[])
      : control.client.findAll(attachment.class.Attachment, { attachedTo: origin._id })
  ])

  const createTx = control.client.txFactory.createTxCreateDoc(base, origin.space, props, targetId)
  const txes: Tx[] = [createTx]

  for (const mixin of hierarchy.findAllMixins(origin)) {
    if (config.excludeMixins?.includes(mixin) === true) continue
    const mixinData: Partial<Data<Doc>> = {}
    const mixinRecord = mixinData as Record<string, unknown>
    const mixedOrigin = hierarchy.as(origin, mixin)
    for (const [key] of hierarchy.getOwnAttributes(mixin)) {
      mixinRecord[key] = getObjectValue(key, mixedOrigin)
    }
    txes.push(control.client.txFactory.createTxMixin(targetId, base, origin.space, mixin, mixinData))
  }

  for (const relation of relationsA) {
    if (config.excludedRelations?.includes(`${relation.association}_b`) === true) continue
    txes.push(
      control.client.txFactory.createTxCreateDoc(core.class.Relation, core.space.Workspace, {
        docA: targetId,
        docB: relation.docB,
        association: relation.association
      })
    )
  }
  for (const relation of relationsB) {
    if (config.excludedRelations?.includes(`${relation.association}_a`) === true) continue
    txes.push(
      control.client.txFactory.createTxCreateDoc(core.class.Relation, core.space.Workspace, {
        docA: relation.docA,
        docB: targetId,
        association: relation.association
      })
    )
  }

  for (const item of attachments) {
    const {
      _id,
      _class,
      space,
      modifiedBy,
      modifiedOn,
      createdBy,
      createdOn,
      attachedTo,
      attachedToClass,
      collection,
      ...attachmentData
    } = item
    const attachmentTx = control.client.txFactory.createTxCreateDoc(
      attachment.class.Attachment,
      origin.space,
      attachmentData as Data<Attachment>,
      generateId<Attachment>()
    )
    txes.push(control.client.txFactory.createTxCollectionCUD(base, targetId, origin.space, 'attachments', attachmentTx))
  }

  return {
    txes,
    rollback: [
      control.client.txFactory.createTxRemoveDoc(base, origin.space, targetId),
      control.client.txFactory.createTxUpdateDoc(origin._class, origin.space, origin._id, {
        isLatest: true,
        readonly: false
      })
    ],
    context: [{ _id: targetId, value: TxProcessor.createDoc2Doc(createTx, true) }]
  }
}

async function setVersionCreationDisabled (
  execution: Execution,
  control: ProcessControl,
  disabled: boolean
): Promise<ExecuteResult> {
  const target = await getLatestCardVersion(execution, control)
  const versioning = control.client.getHierarchy().classHierarchyMixin(target._class, core.mixin.VersionableClass)
  if (versioning?.enabled !== true) throw new Error('Versioning is not enabled for this class')

  const tx = control.client.txFactory.createTxUpdateDoc(target._class, target.space, target._id, {
    versionCreationDisabled: disabled
  })
  const rollback = control.client.txFactory.createTxUpdateDoc(target._class, target.space, target._id, {
    versionCreationDisabled: target.versionCreationDisabled === true
  })
  return { txes: [tx], rollback: [rollback], context: null }
}

export async function DisableVersionCreation (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  return await setVersionCreationDisabled(execution, control, true)
}

export async function EnableVersionCreation (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  return await setVersionCreationDisabled(execution, control, false)
}

/** Removes a tag from the execution card unless a descendant tag is still applied. */
export async function RemoveTag (
  params: MethodParams<Tag>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (typeof params._id !== 'string' || params._id === '') {
    throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  }
  const tagId = params._id as Ref<Tag>
  const card: Card | undefined =
    control.cache.get(execution.card) ?? (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const hierarchy = control.client.getHierarchy()
  const tag = control.client.getModel().findObject(tagId)
  if (
    tag !== undefined &&
    hierarchy.getDescendants(tagId).some((descendant) => descendant !== tagId && hierarchy.hasMixin(card, descendant))
  ) {
    throw processError(process.error.TagHasSubtags)
  }
  if (!hierarchy.hasMixin(card, tagId)) return { txes: [], rollback: [], context: null }

  const tx = control.client.txFactory.createTxUpdateDoc(card._class, card.space, card._id, {
    $unset: { [tagId]: true }
  })
  const rollback = control.client.txFactory.createTxUpdateDoc(card._class, card.space, card._id, {
    [tagId]: getObjectValue(tagId, card)
  })
  return { txes: [tx], rollback: [rollback], context: null }
}

export async function AddTag (
  params: MethodParams<Tag>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  const { _id, props, requiredProperties } = params
  if (_id === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const tagId = _id as Ref<Tag>
  const res: Tx[] = []
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.process })
  // todo fill default for tag and set parent tags
  const mergedProps = { ...props }
  if (requiredProperties !== undefined && typeof requiredProperties === 'object' && requiredProperties !== null) {
    Object.assign(mergedProps, requiredProperties)
  }
  const tx = control.client.txFactory.createTxMixin(
    execution.card,
    _process.masterTag,
    execution.space,
    tagId,
    mergedProps
  )
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
    const [txes, rbTxes] = await createExecution(proc._id, execution.card, execution.space, control)
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
        currentState: null as any,
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

/**
 * A guest assigned to a process task must be able to read the card, otherwise it can not complete the task and
 * the execution would wait forever. Such an assignment fails the step instead of granting access implicitly.
 * Uses the same guest read rules as the guest permissions middleware, which checks the task updates.
 */
async function checkGuestAssignees (
  users: Array<Ref<Person>>,
  execution: Execution,
  control: ProcessControl
): Promise<void> {
  if (users.length === 0) return
  const persons = await control.client.findAll(contact.class.Person, { _id: { $in: users } })
  if (persons.length === 0) return
  const h = control.client.getHierarchy()
  const guests = persons.filter(
    (person) => h.hasMixin(person, contact.mixin.Employee) && h.as(person, contact.mixin.Employee).role === 'GUEST'
  )
  if (guests.length === 0) return

  const card: Card | undefined =
    control.cache.get(execution.card) ?? (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const space = await control.client.findOne(core.class.Space, { _id: card.space })
  const collaboratorTargets = getGuestReadCollaboratorTargets(control.client.getModel(), h, card)

  for (const guest of guests) {
    const account = h.as(guest, contact.mixin.Employee).personUuid
    if (account !== undefined && isSpaceReadableByGuest(space, account)) continue
    if (account !== undefined && collaboratorTargets.length > 0) {
      const collaborators = await control.client.findAll(
        core.class.Collaborator,
        { attachedTo: { $in: collaboratorTargets }, collaborator: account },
        { limit: 1 }
      )
      if (collaborators.length > 0) continue
    }
    throw processError(process.error.GuestWithoutCardAccess, { user: formatName(guest.name) })
  }
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
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'user' })
  }
  const approvers = Array.isArray(params.user) ? params.user : [params.user]
  await checkGuestAssignees(approvers, execution, control)
  for (const user of approvers) {
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
        field: resolveAttributeId(_process, (params as any).field)
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
  const card: Card =
    control.cache.get(execution.card) ?? (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const readonlySections = new Set(card.readonlySections ?? [])
  const target = params._id as Ref<MasterTag>
  readonlySections.add(target)
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    readonlySections: [...readonlySections]
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
  const card: Card =
    control.cache.get(execution.card) ?? (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const target = params._id as Ref<MasterTag>
  const readonlySections = new Set(card.readonlySections ?? [])
  readonlySections.delete(target)
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    readonlySections: [...readonlySections]
  })
  res.push(tx)
  rollback.push(
    control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
      $push: { readonlySections: target }
    })
  )
  return { txes: res, rollback, context: [] }
}

export async function LockField (
  params: Record<string, any>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (params.value === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: 'value' })
  const res: Tx[] = []
  const rollback: Tx[] = []
  const card: Card =
    control.cache.get(execution.card) ?? (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const oldReadonlyFields = card.readonlyFields ?? []
  const readonlyFields = [...oldReadonlyFields]
  const targets = Array.isArray(params.value) ? params.value : [params.value]
  let changed = false
  for (const target of targets) {
    if (!readonlyFields.includes(target)) {
      readonlyFields.push(target)
      changed = true
    }
  }
  if (!changed) {
    return { txes: [], rollback: [], context: [] }
  }
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    readonlyFields
  })
  res.push(tx)
  rollback.push(
    control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
      readonlyFields: oldReadonlyFields
    })
  )
  return { txes: res, rollback, context: [] }
}

export async function UnlockField (
  params: Record<string, any>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (params.value === undefined) throw processError(process.error.RequiredParamsNotProvided, { params: 'value' })
  const res: Tx[] = []
  const rollback: Tx[] = []
  const card: Card =
    control.cache.get(execution.card) ?? (await control.client.findOne(cardPlugin.class.Card, { _id: execution.card }))
  if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
  const oldReadonlyFields = card.readonlyFields ?? []
  const targets = Array.isArray(params.value) ? params.value : [params.value]
  const readonlyFields = oldReadonlyFields.filter((f: string) => !targets.includes(f))
  if (readonlyFields.length === oldReadonlyFields.length) {
    return { txes: [], rollback: [], context: [] }
  }
  const tx = control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
    readonlyFields
  })
  res.push(tx)
  rollback.push(
    control.client.txFactory.createTxUpdateDoc(cardPlugin.class.Card, execution.space, execution.card, {
      readonlyFields: oldReadonlyFields
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
  if (Array.isArray(params.user) && (params.user.length === 0 || params.user.some(isEmpty))) {
    throw processError(process.error.RequiredParamsNotProvided, { params: 'user' })
  }
  const res: TxCreateDoc<ProcessToDo>[] = []
  const rollback: Tx[] = []
  const id = generateId<ProcessToDo>()
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) return { txes: [], rollback: [], context: null }
  const field = resolveAttributeId(_process, (params as any).field)
  const completionMode = params.completionMode === 'all' ? 'all' : 'any'
  const askRequired = completionMode !== 'all' && params.askRequired === true
  const todoResults = completionMode === 'all' ? [] : [...(results ?? [])]
  if (askRequired) {
    const h = control.client.getHierarchy()
    const card = control.cache.get(execution.card)
    if (card === undefined) throw processError(process.error.ObjectNotFound, { _id: execution.card })
    const classId = h.isMixin(_process.masterTag) ? _process.masterTag : h.getBaseClass(card._class)
    const allAttributes = Array.from(
      h.isMixin(classId) ? h.getOwnAttributes(classId).values() : h.getAllAttributes(classId, core.class.Doc).values()
    )

    for (const attr of allAttributes) {
      if (attr.hidden === true || attr.required !== true) continue
      if (todoResults.some((r) => r.key === attr.name)) continue

      todoResults.push({
        _id: generateId() as any as ContextId,
        name: attr.label,
        key: attr.name,
        type: attr.type
      })
    }
  }

  const users = [...new Set<ProcessToDo['user']>(Array.isArray(params.user) ? params.user : [params.user])]
  await checkGuestAssignees(users, execution, control)
  for (const [index, user] of users.entries()) {
    const todoId = index === 0 ? id : generateId<ProcessToDo>()
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
        user,
        group: id,
        completionMode,
        description: params.description ?? '',
        dueDate: params.dueDate,
        priority: params.priority ?? ToDoPriority.NoPriority,
        visibility: 'public',
        doneOn: null,
        rank: '',
        withRollback: params.withRollback ?? false,
        results: todoResults,
        field,
        askRequired
      },
      todoId
    )
    res.push(tx)
  }
  return {
    txes: res,
    rollback,
    context: [
      {
        _id: id,
        value: TxProcessor.createDoc2Doc(res[0], true)
      }
    ]
  }
}

export async function CancelToDo (
  params: MethodParams<ProcessToDo>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult> {
  if (typeof params._id !== 'string') throw processError(process.error.RequiredParamsNotProvided, { params: '_id' })
  const todos = await findProcessToDos(control, execution, params._id, true)
  const res: Tx[] = []
  const rollback: Tx[] = []
  for (const todo of todos) {
    res.push(control.client.txFactory.createTxRemoveDoc(todo._class, todo.space, todo._id))
    rollback.push(
      control.client.txFactory.createTxCreateDoc(
        todo._class,
        todo.space,
        { ...todo },
        todo._id,
        todo.modifiedOn,
        todo.modifiedBy
      )
    )
  }
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
  const { _class, title, content, requiredFields, ...attrs } = params
  for (const key in { _class, title }) {
    const val = (params as any)[key]
    if (isEmpty(val)) {
      throw processError(process.error.RequiredParamsNotProvided, { params: key })
    }
  }
  const _process = control.client.getModel().findObject(execution.process)
  if (_process === undefined) {
    throw processError(process.error.RequiredParamsNotProvided, {})
  }
  if (requiredFields !== undefined && typeof requiredFields === 'object' && requiredFields !== null) {
    Object.assign(attrs, requiredFields)
  }
  const resolvedAttrs: Record<string, unknown> = {}
  for (const key in attrs) {
    resolvedAttrs[resolveAttributeId(_process, key)] = (attrs as any)[key]
  }
  const { space, ...cardAttrs } = resolvedAttrs
  const targetSpace = typeof space === 'string' && !isEmpty(space) ? (space as Ref<Space>) : execution.space
  const masterTag = _class as Ref<MasterTag>
  const _id = generateId<Card>()
  const newContent =
    content !== undefined && !isEmpty(content) ? await getContent(control, content, _id, masterTag) : content
  const data = {
    title,
    ...cardAttrs
  } as any
  if (newContent !== undefined) {
    data.content = newContent
  }
  const filledData = fillDefaults(control.client.getHierarchy(), data, masterTag)

  const tx = control.client.txFactory.createTxCreateDoc(masterTag, targetSpace, filledData, _id)
  const res: Tx[] = [tx]
  const rollback: Tx[] = [control.client.txFactory.createTxRemoveDoc(masterTag, targetSpace, _id)]

  const ancestors = control.client
    .getHierarchy()
    .getAncestors(masterTag)
    .filter((p) => control.client.getHierarchy().isDerived(p, cardPlugin.class.Card))

  const processes = control.client.getModel().findAllSync(process.class.Process, {
    masterTag: { $in: ancestors },
    autoStart: true
  })
  for (const proc of processes) {
    const [txes, rbTxes] = await createExecution(proc._id, _id, targetSpace, control)
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
  space: Ref<Space>,
  control: ProcessControl
): Promise<[Tx[], Tx[]]> {
  const res: Tx[] = []
  const rollback: Tx[] = []
  const initTransition = control.client.getModel().findAllSync(process.class.Transition, {
    process: proc,
    from: null,
    trigger: process.trigger.OnExecutionStart
  })[0]
  if (initTransition === undefined) return [res, rollback]
  const execId = generateId()
  const tx = control.client.txFactory.createTxCreateDoc(
    process.class.Execution,
    space,
    {
      process: proc,
      currentState: null as any,
      card: _id,
      rollback: [],
      context: {},
      status: ExecutionStatus.Active
    },
    execId
  )

  res.push(tx)
  rollback.push(control.client.txFactory.createTxRemoveDoc(process.class.Execution, space, execId))
  return [res, rollback]
}
