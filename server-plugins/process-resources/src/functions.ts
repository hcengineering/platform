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

import cardPlugin, { Card, MasterTag } from '@hcengineering/card'
import core, { Association, Data, Doc, generateId, Hierarchy, matchQuery, Ref, Relation, Tx } from '@hcengineering/core'
import process, {
  Execution,
  ExecutionContext,
  ExecutionStatus,
  MethodParams,
  Process,
  processError,
  ProcessToDo
} from '@hcengineering/process'
import { ExecuteResult, ProcessControl } from '@hcengineering/server-process'
import time, { ToDoPriority } from '@hcengineering/time'

export function CheckToDo (params: Record<string, any>, context: Record<string, any>): boolean {
  if (params._id === undefined) return false
  if (context.todo === undefined) return false
  return context.todo._id === params._id
}

export function OnCardUpdateCheck (
  params: Record<string, any>,
  context: Record<string, any>,
  hierarchy: Hierarchy
): boolean {
  if (context.card === undefined) return false
  const res = matchQuery([context.card], params, context.card._class, hierarchy, true)
  return res.length > 0
}

export function CheckTime (params: Record<string, any>): boolean {
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
  const res: Tx[] = [control.client.txFactory.createTxCreateDoc(core.class.Relation, core.space.Workspace, data, _id)]
  const rollback: Tx[] = [control.client.txFactory.createTxRemoveDoc(core.class.Relation, core.space.Workspace, _id)]
  return { txes: res, rollback, context: _id }
}

export async function UpdateCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult | undefined> {
  if (Object.keys(params).length === 0) return
  const target = control.cache.get(execution.card)
  if (target === undefined) return
  const update: Record<string, any> = {}
  const prevValue: Record<string, any> = {}
  for (const key in params) {
    prevValue[key] = target[key]
    update[key] = (params as any)[key]
  }
  const res: Tx[] = [control.client.txFactory.createTxUpdateDoc(target._class, target.space, target._id, update)]
  const rollback: Tx[] = [
    control.client.txFactory.createTxUpdateDoc(target._class, target.space, target._id, prevValue)
  ]
  return { txes: res, rollback, context: null }
}

export async function RunSubProcess (
  params: MethodParams<Execution>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult | undefined> {
  if (params._id === undefined) return
  const card = params.card ?? execution.card
  const processId = params._id as Ref<Process>
  const target = control.client.getModel().findObject(processId)
  if (target === undefined) return
  const res: Tx[] = []
  const context: Ref<Execution>[] = []
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
    const emptyContext = {} as ExecutionContext
    const id = generateId<Execution>()
    res.push(
      control.client.txFactory.createTxCreateDoc(
        process.class.Execution,
        core.space.Workspace,
        {
          process: processId,
          currentState: initTransition.to,
          card: _card,
          context: emptyContext,
          status: ExecutionStatus.Active,
          rollback: [],
          parentId: execution._id
        },
        id
      )
    )
    context.push(id)
  }
  return { txes: res, rollback: undefined, context }
}

export async function CreateToDo (
  params: MethodParams<ProcessToDo>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult | undefined> {
  for (const key in { user: params.user, title: params.title }) {
    const val = (params as any)[key]
    if (isEmpty(val)) {
      throw processError(process.error.RequiredParamsNotProvided, { params: key })
    }
  }
  if (params.user === undefined || params.title === undefined) return
  const res: Tx[] = []
  const rollback: Tx[] = []
  const id = generateId<ProcessToDo>()
  res.push(
    control.client.txFactory.createTxCreateDoc(
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
        rank: '',
        withRollback: params.withRollback ?? false
      },
      id
    )
  )
  return { txes: res, rollback, context: id }
}

export async function CreateCard (
  params: MethodParams<Card>,
  execution: Execution,
  control: ProcessControl
): Promise<ExecuteResult | undefined> {
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
  const res: Tx[] = [control.client.txFactory.createTxCreateDoc(_class as Ref<MasterTag>, execution.space, data, _id)]
  const rollback: Tx[] = [control.client.txFactory.createTxRemoveDoc(_class as Ref<MasterTag>, execution.space, _id)]
  return { txes: res, rollback, context: _id }
}

function isEmpty (value: any): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}
