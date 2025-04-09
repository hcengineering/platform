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

import { type Card } from '@hcengineering/card'
import core, {
  type AnyAttribute,
  type ArrOf,
  type Association,
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type Ref,
  type RefTo,
  type Type
} from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import {
  parseContext,
  type Context,
  type Execution,
  type Method,
  type NestedContext,
  type Process,
  type ProcessFunction,
  type RelatedContext,
  type State,
  type Step
} from '@hcengineering/process'
import { showPopup } from '@hcengineering/ui'
import { type AttributeCategory } from '@hcengineering/view'
import process from './plugin'

export async function initStep<T extends Doc> (methodId: Ref<Method<T>>): Promise<Step<T>> {
  return {
    methodId,
    params: {}
  }
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
    if (refAttributes.length === 0) continue
    relations[rel.nameB] = {
      name: rel.nameB,
      association: rel._id,
      direction: 'B',
      attributes: refAttributes
    }
  }

  const relationsB = allRelations.filter((it) => descendants.has(it.classB))
  for (const rel of relationsB) {
    const refAttributes = getClassAttributes(client, rel.classA, target, 'attribute')
    if (refAttributes.length === 0) continue
    relations[rel.nameA] = {
      name: rel.nameA,
      association: rel._id,
      direction: 'A',
      attributes: refAttributes
    }
  }

  return {
    attributes,
    nested,
    relations
  }
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

export function showDoneQuery (value: any, query: DocumentQuery<Doc>): DocumentQuery<Doc> {
  if (value === false) {
    return { ...query, done: false }
  }
  return query
}

export async function continueExecution (value: Execution): Promise<void> {
  if (value.error == null) return
  const client = getClient()
  const context = await getNextStateUserInput(value, value.context ?? {})
  await client.update(value, { error: null, context })
}

export async function requestUserInput (
  target: Ref<State>,
  userContext: Record<string, any>
): Promise<Record<string, any>> {
  const client = getClient()
  const state = client.getModel().findObject(target)
  if (state === undefined) return userContext
  userContext = await getStateUserInput(state, userContext)
  userContext = await getSubProcessesUserInput(state, userContext)
  return userContext
}

export async function getStateUserInput (state: State, userContext: Record<string, any>): Promise<Record<string, any>> {
  for (const action of [...state.actions, state.endAction]) {
    if (action == null) continue
    for (const key in action.params) {
      const value = (action.params as any)[key]
      const context = parseContext(value)
      if (context !== undefined && context.type === 'userRequest') {
        const promise = new Promise<void>((resolve) => {
          showPopup(
            process.component.RequestUserInput,
            { key: context.key, _class: context._class },
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
  state: State,
  userContext: Record<string, any>
): Promise<Record<string, any>> {
  for (const action of state.actions) {
    if (action.methodId !== process.method.RunSubProcess) continue
    const processId = action.params._id as Ref<Process>
    if (processId === undefined) continue
    await newExecutionUserInput(processId, userContext)
  }
  return userContext
}

export async function newExecutionUserInput (
  _id: Ref<Process>,
  userContext: Record<string, any>
): Promise<Record<string, any>> {
  const client = getClient()
  const process = client.getModel().findObject(_id)
  if (process === undefined) return userContext
  const stateId = process.states[0]
  if (stateId === undefined) return userContext
  return await requestUserInput(stateId, userContext)
}

export async function getNextStateUserInput (
  execution: Execution,
  userContext: Record<string, any>
): Promise<Record<string, any>> {
  const client = getClient()
  const process = client.getModel().findObject(execution.process)
  if (process === undefined) return userContext
  const currentIndex =
    execution.currentState == null ? -1 : process.states.findIndex((p) => p === execution.currentState)
  const nextState = process.states[currentIndex + 1]
  return await requestUserInput(nextState, userContext)
}

export async function createExecution (card: Ref<Card>, _id: Ref<Process>): Promise<void> {
  const client = getClient()
  const context = await newExecutionUserInput(_id, {})

  await client.createDoc(process.class.Execution, core.space.Workspace, {
    process: _id,
    currentState: null,
    card,
    done: false,
    rollback: {},
    currentToDo: null,
    assignee: null,
    context
  })
}
