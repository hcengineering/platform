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
  generateId,
  type AnyAttribute,
  type ArrOf,
  type Association,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type ModelDb,
  type Ref,
  type RefTo,
  type Space,
  type TxOperations,
  type Type
} from '@hcengineering/core'
import { getResource, PlatformError, Severity, Status } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import {
  ExecutionStatus,
  parseContext,
  type Context,
  type ContextId,
  type Execution,
  type ExecutionContext,
  type Method,
  type NestedContext,
  type Process,
  type ProcessFunction,
  type RelatedContext,
  type SelectedContext,
  type SelectedUserRequest,
  type State,
  type Step,
  type StepId,
  type Transition
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

export function getContextAttribute (
  client: Client,
  context: SelectedContext | undefined,
  masterTag: Ref<MasterTag>
): AnyAttribute | undefined {
  if (context === undefined) return
  const h = client.getHierarchy()
  const model = client.getModel()
  if (context.type === 'attribute') {
    return h.findAttribute(masterTag, context.key)
  }
  if (context.type === 'nested') {
    const attr = h.findAttribute(masterTag, context.path)
    if (attr === undefined) return
    const parentType = attr.type._class === core.class.ArrOf ? (attr.type as ArrOf<Doc>).of : attr.type
    const targetClass = parentType._class === core.class.RefTo ? (parentType as RefTo<Doc>).to : parentType._class
    return h.findAttribute(targetClass, context.key)
  }
  if (context.type === 'relation') {
    const assoc = model.findObject(context.association)
    if (assoc === undefined) return
    const targetClass = context.direction === 'A' ? assoc.classA : assoc.classB
    return h.findAttribute(targetClass, context.key)
  }
}

export async function pickTransition (
  model: ModelDb,
  execution: Execution,
  transitions: Transition[],
  doc: Doc
): Promise<Transition | undefined> {
  for (const tr of transitions) {
    const trigger = model.findObject(tr.trigger)
    if (trigger === undefined) continue
    if (trigger.checkFunction === undefined) return tr
    const filled = fillParams(tr.triggerParams, execution)
    const checkFunc = await getResource(trigger.checkFunction)
    if (checkFunc === undefined) continue
    const res = await checkFunc(filled, doc)
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
    contextId: method.contextClass !== null ? generateContextId() : null,
    methodId,
    params: {}
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
  const descendants = new Set(client.getHierarchy().getDescendants(process.masterTag))

  const relationsA = allRelations.filter((it) => descendants.has(it.classA))
  for (const rel of relationsA) {
    const refAttributes = getClassAttributes(client, rel.classB, target, 'attribute')
    if (refAttributes.length > 0) {
      relations[rel.nameB] = {
        name: rel.nameB,
        association: rel._id,
        direction: 'B',
        attributes: refAttributes
      }
    } else if (category === 'object' && client.getHierarchy().isDerived(rel.classB, target)) {
      relations[rel.nameB] = {
        name: rel.nameB,
        association: rel._id,
        direction: 'B',
        attributes: []
      }
    }
  }

  const relationsB = allRelations.filter((it) => descendants.has(it.classB))
  for (const rel of relationsB) {
    const refAttributes = getClassAttributes(client, rel.classA, target, 'attribute')
    if (refAttributes.length > 0) {
      relations[rel.nameA] = {
        name: rel.nameA,
        association: rel._id,
        direction: 'A',
        attributes: refAttributes
      }
    } else if (category === 'object' && client.getHierarchy().isDerived(rel.classA, target)) {
      relations[rel.nameA] = {
        name: rel.nameA,
        association: rel._id,
        direction: 'A',
        attributes: []
      }
    }
  }

  return {
    functions,
    attributes,
    nested,
    relations
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
      case 'object': {
        if (func.category === 'array') {
          if (hierarchy.isDerived(func.of, target)) {
            matched.push(func._id)
          }
        }
        if (func.category === 'object') {
          if (hierarchy.isDerived(func.of, target)) {
            matched.push(func._id)
          }
        }
        break
      }
      case 'array': {
        if (func.category === 'array') {
          if (hierarchy.isDerived(func.of, target)) {
            matched.push(func._id)
          }
        }
        break
      }
      default: {
        if (func.of === target) {
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
): Ref<ProcessFunction> | undefined {
  const assoc = client.getModel().findObject(association)
  if (assoc === undefined) return undefined
  if (assoc.type === '1:1') return undefined
  if (assoc.type === '1:N' && direction === 'B') return undefined
  if (target.type._class === core.class.ArrOf) return undefined
  return process.function.FirstValue
}

export function getRelationReduceFunc (
  client: Client,
  association: Ref<Association>,
  direction: 'A' | 'B'
): Ref<ProcessFunction> | undefined {
  const assoc = client.getModel().findObject(association)
  if (assoc === undefined) return undefined
  if (assoc.type === '1:1') return undefined
  if (assoc.type === '1:N' && direction === 'B') return undefined
  return process.function.FirstValue
}

export function getValueReduceFunc (source: AnyAttribute, target: AnyAttribute): Ref<ProcessFunction> | undefined {
  if (source.type._class !== core.class.ArrOf) return undefined
  if (target.type._class === core.class.ArrOf) return undefined
  return process.function.FirstValue
}

export function getContextFunctionReduce (
  func: ProcessFunction,
  target: AnyAttribute
): Ref<ProcessFunction> | undefined {
  if (func.category !== 'array') return undefined
  if (target.type._class === core.class.ArrOf) return undefined
  return process.function.FirstValue
}

export function showDoneQuery (value: any, query: DocumentQuery<Doc>): DocumentQuery<Doc> {
  if (value === false) {
    return { ...query, done: false }
  }
  return query
}

export async function continueExecution (value: Execution): Promise<void> {
  if (value.error == null) return
  const client = getClient()
  let context = value.context
  const transition = value.error[0].transition
  if (transition == null) {
    context = await newExecutionUserInput(value.process, context)
  } else {
    const _transition = client.getModel().findObject(transition)
    if (_transition === undefined) return
    context = await getNextStateUserInput(value, _transition, value.context)
  }
  await client.update(value, { status: ExecutionStatus.Active, context })
}

export async function requestUserInput (
  processId: Ref<Process>,
  target: Transition,
  userContext: ExecutionContext
): Promise<ExecutionContext> {
  userContext = await getTransitionUserInput(processId, target, userContext)
  userContext = await getSubProcessesUserInput(target, userContext)
  return userContext
}

export async function getTransitionUserInput (
  processId: Ref<Process>,
  transition: Transition,
  userContext: ExecutionContext
): Promise<ExecutionContext> {
  for (const action of transition.actions) {
    if (action == null) continue
    for (const key in action.params) {
      const value = (action.params as any)[key]
      const context = parseContext(value)
      if (context !== undefined && context.type === 'userRequest') {
        const promise = new Promise<void>((resolve) => {
          showPopup(
            process.component.RequestUserInput,
            { processId, transition: transition._id, key: context.key, _class: context._class },
            undefined,
            (res) => {
              if (res?.value !== undefined) {
                userContext[context.id] = res.value
              }
              resolve()
            }
          )
        })
        await promise
      }
    }
  }
  return userContext
}

export async function getSubProcessesUserInput (
  transition: Transition,
  userContext: ExecutionContext
): Promise<ExecutionContext> {
  for (const action of transition.actions) {
    if (action.methodId !== process.method.RunSubProcess) continue
    const processId = action.params._id as Ref<Process>
    if (processId === undefined) continue
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const res = await newExecutionUserInput(processId, {} as ExecutionContext)
    if (action.contextId == null) continue
    userContext[action.contextId] = res
  }
  return userContext
}

export async function newExecutionUserInput (
  _id: Ref<Process>,
  userContext: ExecutionContext
): Promise<ExecutionContext> {
  const client = getClient()
  const initTransition = client.getModel().findAllSync(process.class.Transition, {
    process: _id,
    from: null
  })[0]
  if (initTransition === undefined) return userContext
  return await requestUserInput(_id, initTransition, userContext)
}

export async function getNextStateUserInput (
  execution: Execution,
  transition: Transition,
  userContext: ExecutionContext
): Promise<ExecutionContext> {
  const client = getClient()
  const process = client.getModel().findObject(execution.process)
  if (process === undefined) return userContext
  return await requestUserInput(execution.process, transition, userContext)
}

export async function createExecution (card: Ref<Card>, _id: Ref<Process>, space: Ref<Space>): Promise<void> {
  const client = getClient()
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const context = await newExecutionUserInput(_id, {} as ExecutionContext)
  const _process = client.getModel().findObject(_id)
  if (_process === undefined) return
  const initTransition = client.getModel().findAllSync(process.class.Transition, {
    process: _id,
    from: null
  })[0]
  if (initTransition === undefined) return
  await client.createDoc(process.class.Execution, space, {
    process: _id,
    currentState: initTransition.to,
    card,
    rollback: [],
    context,
    status: ExecutionStatus.Active
  })
}

export function getToDoEndAction (prevState: State): Step<Doc> {
  const context: SelectedUserRequest = {
    id: generateContextId(),
    type: 'userRequest',
    key: 'user',
    _class: process.class.ProcessToDo
  }
  const endAction = {
    _id: generateId() as string as StepId,
    contextId: generateContextId(),
    methodId: process.method.CreateToDo,
    system: true,
    params: {
      state: prevState._id,
      title: prevState.title,
      user: '$' + JSON.stringify(context)
    }
  }
  return endAction
}

export async function requestResult (
  txop: TxOperations,
  execution: Execution,
  transition: Transition,
  context: ExecutionContext
): Promise<void> {
  for (const action of transition.actions) {
    if (action.result == null) continue
    const promise = new Promise<void>((resolve, reject) => {
      showPopup(
        process.component.ResultInput,
        { type: action.result?.type, name: action.result?.name },
        undefined,
        (res) => {
          if (action.result?._id === undefined) return
          if (res?.value !== undefined) {
            context[action.result._id] = res.value
            resolve()
          } else {
            reject(new PlatformError(new Status(Severity.ERROR, process.error.ResultNotProvided, {})))
          }
        }
      )
    })
    await promise
    await txop.update(execution, {
      context
    })
  }
}

export function todoTranstionCheck (params: Record<string, any>, doc: Doc): boolean {
  if (params._id === undefined) return false
  return doc._id === params._id
}
