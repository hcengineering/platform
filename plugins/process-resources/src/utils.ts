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

import { type Card, type MasterTag } from '@hcengineering/card'
import core, {
  type AnyAttribute,
  type ArrOf,
  type Association,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  generateId,
  matchQuery,
  type Ref,
  type RefTo,
  type Space,
  type TxCUD,
  type TxFactory,
  TxProcessor,
  type Type
} from '@hcengineering/core'
import { getResource, type IntlString, PlatformError, Severity, Status } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import {
  type Context,
  type ContextId,
  createContext,
  type Execution,
  type ExecutionContext,
  ExecutionStatus,
  type Func,
  type Method,
  type NestedContext,
  parseContext,
  type Process,
  type ProcessExecutionContext,
  type ProcessFunction,
  type RelatedContext,
  type SelectedContext,
  type SelectedUserRequest,
  type State,
  type Step,
  type StepId,
  type Transition,
  type UpdateCriteriaComponent,
  type UserResult
} from '@hcengineering/process'
import { showPopup } from '@hcengineering/ui'
import { type AttributeCategory } from '@hcengineering/view'
import process from './plugin'

export function isTypeEqual (toCheck: Type<any> | undefined, attr: Type<any>): boolean {
  const skip = ['label', 'icon', 'hidden', 'readonly']
  if (toCheck === undefined) return true
  if (Object.keys(attr).length !== Object.keys(toCheck).length) return true
  for (const key of Object.keys(attr)) {
    if (skip.includes(key)) continue
    if (toCheck[key as keyof Type<any>] !== attr[key as keyof Type<any>]) return false
  }
  return true
}

export function generateContextId (): ContextId {
  return generateId() as string as ContextId
}

export function getContextMasterTag (
  client: Client,
  context: SelectedContext | undefined,
  process: Process
): Ref<MasterTag> | undefined {
  if (context === undefined) return
  const h = client.getHierarchy()
  const model = client.getModel()
  if (context.type === 'attribute') {
    const attr = h.findAttribute(process.masterTag, context.key)
    if (attr === undefined) return
    const parentType = attr.type._class === core.class.ArrOf ? (attr.type as ArrOf<Doc>).of : attr.type
    if (parentType._class === core.class.RefTo) return (parentType as RefTo<Doc>).to
  }
  if (context.type === 'nested') {
    const attr = h.findAttribute(process.masterTag, context.path)
    if (attr === undefined) return
    const parentType = attr.type._class === core.class.ArrOf ? (attr.type as ArrOf<Doc>).of : attr.type
    const targetClass = parentType._class === core.class.RefTo ? (parentType as RefTo<Doc>).to : parentType._class
    const nested = h.findAttribute(targetClass, context.key)
    return (nested?.type as RefTo<Doc>)?.to
  }
  if (context.type === 'relation') {
    const assoc = model.findObject(context.association)
    if (assoc === undefined) return
    const targetClass = context.direction === 'A' ? assoc.classA : assoc.classB
    if (context.key === '_id') return targetClass as Ref<MasterTag>
    const nested = h.findAttribute(targetClass, context.key)
    return (nested?.type as RefTo<Doc>)?.to
  }
  if (context.type === 'context') {
    const execContext = process.context[context.id]
    if (execContext === undefined) return
    return execContext._class
  }
}

export async function pickTransition (
  client: Client,
  execution: Execution,
  transitions: Transition[],
  context: Record<string, any>
): Promise<Transition | undefined> {
  for (const tr of transitions) {
    const trigger = client.getModel().findObject(tr.trigger)
    if (trigger === undefined) continue
    if (trigger.checkFunction === undefined) return tr
    const filled = fillParams(tr.triggerParams, execution)
    const checkFunc = await getResource(trigger.checkFunction)
    if (checkFunc === undefined) continue
    const res = await checkFunc(client, execution, filled, context)
    if (res) return tr
  }
}

function fillParams (params: Record<string, any>, execution: Execution): Record<string, any> {
  const res: Record<string, any> = {}
  for (const key in params) {
    const value = params[key]
    const context = parseContext(value)
    if (context === undefined) {
      res[key] = value
      continue
    }
    if (context.type === 'context') {
      res[key] = execution.context[context.id]
    }
  }
  return res
}

export async function initState<T extends Doc> (methodId: Ref<Method<T>>): Promise<Step<T>> {
  const client = getClient()
  const method = client.getModel().findObject(methodId)
  if (method === undefined) {
    throw new Error('Process not found')
  }
  const step: Step<T> = {
    _id: generateId() as string as StepId,
    context:
      method.createdContext !== null
        ? {
            _id: generateContextId(),
            _class: method.createdContext._class
          }
        : null,
    methodId,
    params: method.defaultParams ?? {}
  }
  return step
}

// we should find all possible sources of data with selected type
// I think one step depth should be enough for now
export function getContext (
  client: Client,
  process: Process,
  target: Ref<Class<Type<any>>>,
  category: AttributeCategory,
  attr?: Ref<AnyAttribute>
): Context {
  let attributes = getClassAttributes(client, process.masterTag, target, category)
  if (attr !== undefined && category === 'object') {
    attributes = attributes.filter((it) => it._id !== attr)
  }

  const functions = getContextFunctions(client, process.masterTag, target, category)
  const nested: Record<string, NestedContext> = {}
  const relations: Record<string, RelatedContext> = {}
  const executionContext: Record<string, ProcessExecutionContext> = {}

  const refs = getClassAttributes(client, process.masterTag, core.class.RefTo, 'attribute')
  for (const ref of refs) {
    const refAttributes = getClassAttributes(client, (ref.type as RefTo<Doc>).to, target, 'attribute')
    if (refAttributes.length === 0) continue
    nested[ref.name] = {
      attribute: ref,
      attributes: refAttributes
    }
  }

  const arrs = getClassAttributes(client, process.masterTag, core.class.ArrOf, 'attribute')
  for (const arr of arrs) {
    const arrOf = (arr.type as ArrOf<Doc>).of
    if (arrOf._class !== core.class.RefTo) continue
    const to = (arrOf as RefTo<Doc>).to
    const arrAttributes = getClassAttributes(client, to, target, 'attribute')
    if (arrAttributes.length === 0) continue
    nested[arr.name] = {
      attribute: arr,
      attributes: arrAttributes
    }
  }
  const allRelations = client.getModel().findAllSync(core.class.Association, {})
  const ancestors = new Set(client.getHierarchy().getAncestors(process.masterTag))

  const relationsA = allRelations.filter((it) => ancestors.has(it.classA))
  for (const rel of relationsA) {
    if (['object', 'array'].includes(category) && client.getHierarchy().isDerived(rel.classB, target)) {
      relations[rel.nameB] = {
        name: rel.nameB,
        association: rel._id,
        direction: 'B',
        attributes: []
      }
    } else {
      const refAttributes = getClassAttributes(client, rel.classB, target, 'attribute')
      if (refAttributes.length > 0) {
        relations[rel.nameB] = {
          name: rel.nameB,
          association: rel._id,
          direction: 'B',
          attributes: refAttributes
        }
      }
    }
  }

  const relationsB = allRelations.filter((it) => ancestors.has(it.classB))
  for (const rel of relationsB) {
    if (['object', 'array'].includes(category) && client.getHierarchy().isDerived(rel.classA, target)) {
      relations[rel.nameA] = {
        name: rel.nameA,
        association: rel._id,
        direction: 'A',
        attributes: []
      }
    } else {
      const refAttributes = getClassAttributes(client, rel.classA, target, 'attribute')
      if (refAttributes.length > 0) {
        relations[rel.nameA] = {
          name: rel.nameA,
          association: rel._id,
          direction: 'A',
          attributes: refAttributes
        }
      }
    }
  }

  for (const key in process.context) {
    const contextId = key as ContextId
    const value = process.context[contextId]
    if (client.getHierarchy().isDerived(value._class, target)) {
      executionContext[key] = {
        attributes: [],
        name: value.name,
        context: contextId,
        value: value.value
      }
    } else {
      const contextAttributes = getClassAttributes(client, value._class, target, category)
      if (contextAttributes.length > 0) {
        executionContext[key] = {
          name: value.name,
          context: contextId,
          value: value.value,
          attributes: contextAttributes
        }
      }
    }
  }

  return {
    functions,
    attributes,
    nested,
    relations,
    executionContext
  }
}

function getContextFunctions (
  client: Client,
  _class: Ref<Class<Doc>>,
  target: Ref<Class<Type<any>>>,
  category: AttributeCategory
): Array<Ref<ProcessFunction>> {
  const matched: Array<Ref<ProcessFunction>> = []
  const hierarchy = client.getHierarchy()
  const funcs = client.getModel().findAllSync(process.class.ProcessFunction, { type: 'context' })
  for (const func of funcs) {
    switch (category) {
      case 'array': {
        if (func.category === 'array') {
          if (hierarchy.isDerived(func.of, target) || func.of === core.class.ArrOf) {
            matched.push(func._id)
          }
        }
        break
      }
      default: {
        if (hierarchy.isDerived(func.of, target)) {
          matched.push(func._id)
        }
      }
    }
  }
  return matched
}

function getClassAttributes (
  client: Client,
  _class: Ref<Class<Doc>>,
  target: Ref<Class<Type<any>>>,
  category: AttributeCategory
): AnyAttribute[] {
  const hierarchy = client.getHierarchy()
  const cardAttributes = hierarchy.getAllAttributes(_class)
  const matchedAttributes: AnyAttribute[] = []
  for (const attr of cardAttributes) {
    if (attr[1].hidden === true) continue
    if (attr[1].label === undefined) continue
    switch (category) {
      case 'object': {
        if (attr[1].type._class === core.class.ArrOf) {
          const arrOf = (attr[1].type as ArrOf<Doc>).of
          const attrClass = arrOf._class === core.class.RefTo ? (arrOf as RefTo<Doc>).to : arrOf._class
          if (hierarchy.isDerived(attrClass, target)) {
            matchedAttributes.push(attr[1])
          }
        }
        if (attr[1].type._class === core.class.RefTo) {
          const to = (attr[1].type as RefTo<Doc>).to
          if (hierarchy.isDerived(to, target)) {
            matchedAttributes.push(attr[1])
          }
        }
        break
      }
      case 'array': {
        if (attr[1].type._class === core.class.ArrOf) {
          const arrOf = (attr[1].type as ArrOf<Doc>).of
          const attrClass = arrOf._class === core.class.RefTo ? (arrOf as RefTo<Doc>).to : arrOf._class
          if (hierarchy.isDerived(attrClass, target)) {
            matchedAttributes.push(attr[1])
          }
        }
        break
      }
      default: {
        if (attr[1].type._class === target) {
          matchedAttributes.push(attr[1])
        }
        if (attr[1].type._class === core.class.RefTo) {
          const to = (attr[1].type as RefTo<Doc>).to
          if (hierarchy.isDerived(to, target)) {
            matchedAttributes.push(attr[1])
          }
        }
      }
    }
  }
  return matchedAttributes
}

export function getRelationObjectReduceFunc (
  client: Client,
  association: Ref<Association>,
  direction: 'A' | 'B',
  target: AnyAttribute
): Func | undefined {
  const assoc = client.getModel().findObject(association)
  if (assoc === undefined) return undefined
  if (assoc.type === '1:1') return undefined
  if (assoc.type === '1:N' && direction === 'A') return undefined
  if (target.type._class === core.class.ArrOf) return undefined
  return { func: process.function.FirstValue, props: {} }
}

export function getRelationReduceFunc (
  client: Client,
  association: Ref<Association>,
  direction: 'A' | 'B'
): Func | undefined {
  const assoc = client.getModel().findObject(association)
  if (assoc === undefined) return undefined
  if (assoc.type === '1:1') return undefined
  if (assoc.type === '1:N' && direction === 'A') return undefined
  return { func: process.function.FirstValue, props: {} }
}

export function getValueReduceFunc (source: AnyAttribute, target: AnyAttribute): Func | undefined {
  if (source.type._class !== core.class.ArrOf) return undefined
  if (target.type._class === core.class.ArrOf) return undefined
  return { func: process.function.FirstValue, props: {} }
}

export function getContextFunctionReduce (func: ProcessFunction, target: AnyAttribute): Func | undefined {
  if (func.category !== 'array') return undefined
  if (target.type._class === core.class.ArrOf) return undefined
  return { func: process.function.FirstValue, props: {} }
}

export function showDoneQuery (value: any, query: DocumentQuery<Execution>): DocumentQuery<Execution> {
  if (value === false) {
    return { ...query, status: ExecutionStatus.Active }
  }
  return query
}

export async function continueExecution (value: Execution): Promise<void> {
  if (value.error == null) return
  const client = getClient()
  let context = value.context
  const transition = value.error[0].transition
  if (transition == null) {
    const res = await newExecutionUserInput(value.process, value.space, value)
    context = res?.context ?? context
  } else {
    const _transition = client.getModel().findObject(transition)
    if (_transition === undefined) return
    const res = await getNextStateUserInput(value, _transition, context)
    context = res?.context ?? context
  }
  await client.update(value, { status: ExecutionStatus.Active, context })
}

export async function requestUserInput (
  processId: Ref<Process>,
  space: Ref<Space>,
  target: Transition,
  execution: Execution,
  userContext: ExecutionContext,
  inputContext: Record<string, any> = {}
): Promise<{ context: ExecutionContext, state: Ref<State>, changed: boolean }> {
  const client = getClient()
  let changed = false
  const tr = await getTransitionUserInput(processId, space, target, userContext)
  if (tr !== undefined) {
    userContext = { ...userContext, ...tr }
    changed = true
  }
  const sub = await getSubProcessesUserInput(space, target, userContext)
  if (sub !== undefined) {
    userContext = { ...userContext, ...sub }
    changed = true
  }

  // Follow auto transitions
  const nextAutoTransitions = client
    .getModel()
    .findAllSync(process.class.Transition, {
      process: processId,
      from: target.to
    })
    .filter((t) => client.getModel().findObject(t.trigger)?.auto === true)

  if (nextAutoTransitions.length > 0) {
    const newExecution = {
      ...execution,
      context: userContext,
      currentState: target.to
    }
    const nextTransition = await pickTransition(client, newExecution, nextAutoTransitions, inputContext)
    if (nextTransition !== undefined) {
      const recursive = await requestUserInput(
        processId,
        space,
        nextTransition,
        newExecution,
        userContext,
        inputContext
      )
      return {
        context: recursive.context,
        state: recursive.state,
        changed: changed || recursive.changed
      }
    }
  }

  return { context: userContext, state: target.to, changed }
}

export async function getTransitionUserInput (
  processId: Ref<Process>,
  space: Ref<Space>,
  transition: Transition,
  userContext: ExecutionContext
): Promise<ExecutionContext | undefined> {
  let changed = false
  for (const action of transition.actions) {
    if (action == null) continue
    const inputs: SelectedUserRequest[] = []
    for (const key in action.params) {
      const value = (action.params as any)[key]
      const context = parseContext(value)
      if (context !== undefined && context.type === 'userRequest') {
        inputs.push(context)
      }
    }
    if (inputs.length > 0) {
      const promise = new Promise<void>((resolve) => {
        showPopup(
          process.component.RequestUserInput,
          {
            processId,
            transition: transition._id,
            space,
            inputs,
            values: {}
          },
          undefined,
          (res) => {
            if (res?.value !== undefined) {
              changed = true
              for (const [key, value] of Object.entries(res.value)) {
                userContext[key as ContextId] = value
              }
            }
            resolve()
          }
        )
      })
      await promise
    }
  }
  return changed ? userContext : undefined
}

function getEmptyContext (): ExecutionContext {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {} as ExecutionContext
}

export async function getSubProcessesUserInput (
  space: Ref<Space>,
  transition: Transition,
  userContext: ExecutionContext
): Promise<ExecutionContext | undefined> {
  let changed = false
  for (const action of transition.actions) {
    if (action.methodId !== process.method.RunSubProcess) continue
    const processId = action.params._id as Ref<Process>
    if (processId === undefined) continue
    const context = action.params.context ?? getEmptyContext()
    const res = await newExecutionUserInput(processId, space, context)
    if (action.context == null || res === undefined) continue
    userContext[action.context._id] = res
    changed = true
  }
  return changed ? userContext : undefined
}

export async function newExecutionUserInput (
  _id: Ref<Process>,
  space: Ref<Space>,
  execution: Execution
): Promise<{ context: ExecutionContext, state: Ref<State>, changed: boolean } | undefined> {
  const client = getClient()
  const initTransition = client.getModel().findAllSync(process.class.Transition, {
    process: _id,
    from: null
  })[0]
  if (initTransition === undefined) return undefined
  return await requestUserInput(_id, space, initTransition, execution, execution.context)
}

export async function getNextStateUserInput (
  execution: Execution,
  transition: Transition,
  userContext: ExecutionContext,
  inputContext: Record<string, any> = {}
): Promise<{ context: ExecutionContext, state: Ref<State>, changed: boolean } | undefined> {
  const client = getClient()
  const _process = client.getModel().findObject(execution.process)
  if (_process === undefined) return undefined
  return await requestUserInput(execution.process, execution.space, transition, execution, userContext, inputContext)
}

export async function createExecution (
  card: Ref<Card>,
  _id: Ref<Process>,
  space: Ref<Space>,
  txFactory: TxFactory
): Promise<TxCUD<Doc> | undefined> {
  const client = getClient()

  const _process = client.getModel().findObject(_id)
  if (_process === undefined) return

  const initTransition = client.getModel().findAllSync(process.class.Transition, {
    process: _id,
    from: null
  })[0]
  if (initTransition === undefined) return
  const executionId = generateId<Execution>()

  const mockExecution: Execution = {
    _id: executionId,
    process: _id,
    currentState: initTransition.to,
    card,
    rollback: [],
    context: getEmptyContext(),
    status: ExecutionStatus.Active,
    space,
    _class: process.class.Execution,
    modifiedOn: 0,
    modifiedBy: client.user
  }

  const result = await newExecutionUserInput(_id, space, mockExecution)

  return txFactory.createTxCreateDoc(
    process.class.Execution,
    space,
    {
      process: _id,
      currentState: initTransition.to,
      card,
      rollback: [],
      context: result?.context ?? getEmptyContext(),
      status: ExecutionStatus.Active
    },
    executionId
  )
}

export function getToDoEndAction (prevState: State): Step<Doc> {
  const context: SelectedUserRequest = {
    id: generateContextId(),
    type: 'userRequest',
    key: 'user',
    _class: process.class.ProcessToDo
  }
  const endAction: Step<Doc> = {
    _id: generateId() as string as StepId,
    context: {
      _id: context.id,
      _class: process.class.ProcessToDo
    },
    methodId: process.method.CreateToDo,
    params: {
      state: prevState._id,
      title: prevState.title,
      user: createContext(context)
    }
  }
  return endAction
}

export async function requestResult (
  execution: Execution,
  results: UserResult[] | undefined,
  context: ExecutionContext
): Promise<ExecutionContext | undefined> {
  if (results == null || results.length === 0) return
  const promise = new Promise<void>((resolve, reject) => {
    showPopup(process.component.ResultInput, { results, context }, undefined, (res) => {
      if (res !== undefined) {
        for (const contextId in res) {
          const val = res[contextId]
          context[contextId as ContextId] = val
        }
        resolve()
      } else {
        reject(new PlatformError(new Status(Severity.ERROR, process.error.ResultNotProvided, {})))
      }
    })
  })
  await promise
  return context
}

export function todoTranstionCheck (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  if (params._id === undefined) return false
  return context.todo?._id === params._id
}

export function timeTransitionCheck (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  if (params.value === undefined) return false
  return params.value <= Date.now()
}

export function eventCheck (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  if (params.eventType === undefined) return false
  return context.eventType === params.eventType
}

export async function approveRequestApproved (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  return context.todo?.group === params._id && context.todo?.approved === true
}

export async function approveRequestRejected (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  if (params._id === undefined) return false
  return context.todo?.group === params._id && context.todo?.approved === false
}

export function matchCardCheck (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  const doc = context.card
  if (doc === undefined) return false
  const res = matchQuery([doc], params, doc._class, client.getHierarchy(), true)
  return res.length > 0
}

export function fieldChangesCheck (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): boolean {
  const doc = context.card
  if (doc === undefined) return false
  const operations = (context.operations ?? {}) as DocumentUpdate<Doc>
  const target = Object.keys(params)[0]
  if (!TxProcessor.hasUpdate(operations, target)) return false
  const res = matchQuery([doc], params, doc._class, client.getHierarchy(), true)
  return res.length > 0
}

export async function subProcessesDoneCheck (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  const res = await client.findOne(process.class.Execution, {
    parentId: execution._id,
    status: ExecutionStatus.Active
  })
  return res === undefined
}

export async function subProcessMatchCheck (
  client: Client,
  execution: Execution,
  params: Record<string, any>,
  context: Record<string, any>
): Promise<boolean> {
  const { process: _process, ...otherCritera } = params
  if (_process === undefined) return false
  if (Object.keys(otherCritera).length === 0) return true

  const subProcesses = await client.findAll(process.class.Execution, {
    parentId: execution._id,
    process: params.process
  })

  if (subProcesses.length === 0) return false

  const [predicate, value] = Object.entries(otherCritera)[0]

  const res = matchQuery(
    subProcesses,
    { currentState: { $in: value } },
    process.class.Execution,
    client.getHierarchy(),
    true
  )
  if (predicate === '$all') {
    return res.length === subProcesses.length
  } else if (predicate === '$any') {
    return res.length > 0
  } else if (predicate === '$nin') {
    return res.length === 0
  }
  return false
}

export function getCriteriaEditor (
  of: Ref<Class<Doc>>,
  category: AttributeCategory
): UpdateCriteriaComponent | undefined {
  const client = getClient()
  if (category !== 'attribute') {
    const res = client.getModel().findAllSync(process.class.UpdateCriteriaComponent, {
      category
    })[0]
    return res
  }
  const res = client.getModel().findAllSync(process.class.UpdateCriteriaComponent, {
    category,
    of
  })[0]
  return res
}

export function getMockAttribute (_class: Ref<Class<Doc>>, label: IntlString, type: Type<any>): AnyAttribute {
  return {
    attributeOf: _class,
    name: '',
    _id: generateId(),
    space: core.space.Model,
    modifiedOn: 0,
    modifiedBy: core.account.System,
    _class: core.class.Attribute,
    type,
    label
  }
}

export async function checkProcessSectionVisibility (doc: Card): Promise<boolean> {
  const client = getClient()
  const anc = client.getHierarchy().getAncestors(doc._class)
  const processes = client.getModel().findAllSync(process.class.Process, { masterTag: { $in: anc } })
  return processes.length > 0
}

export async function checkRequestsSectionVisibility (doc: Card): Promise<boolean> {
  const client = getClient()
  const requests = await client.findOne(process.class.ApproveRequest, { card: doc._id })
  return requests !== undefined
}
