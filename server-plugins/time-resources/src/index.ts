//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import contact, { Employee, Person, pickPrimarySocialId } from '@hcengineering/contact'

import core, {
  AttachedData,
  Class,
  Data,
  Doc,
  DocumentUpdate,
  Ref,
  SortingOrder,
  Status,
  Tx,
  TxCUD,
  TxCreateDoc,
  TxFactory,
  TxProcessor,
  TxUpdateDoc,
  toIdMap,
  Space,
  includesAny
} from '@hcengineering/core'
import notification, { CommonInboxNotification } from '@hcengineering/notification'
import { getResource } from '@hcengineering/platform'
import type { TriggerControl } from '@hcengineering/server-core'
import { getSocialStrings, getPerson, getAllSocialStringsByPersonId } from '@hcengineering/server-contact'
import { ReceiverInfo, SenderInfo } from '@hcengineering/server-notification'
import {
  getCommonNotificationTxes,
  getNotificationContent,
  getNotificationProviderControl,
  isShouldNotifyTx
} from '@hcengineering/server-notification-resources'
import serverTime, { OnToDo, ToDoFactory } from '@hcengineering/server-time'
import task, { makeRank } from '@hcengineering/task'
import { jsonToMarkup, nodeDoc, nodeParagraph, nodeText } from '@hcengineering/text-core'
import time, { ProjectToDo, ToDo, ToDoPriority, TodoAutomationHelper, WorkSlot } from '@hcengineering/time'
import tracker, { Issue, IssueStatus, Project, TimeSpendReport } from '@hcengineering/tracker'

/**
 * @public
 */
export async function OnTask (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const mixin = control.hierarchy.classHierarchyMixin<Class<Doc>, ToDoFactory>(
      tx.objectClass,
      serverTime.mixin.ToDoFactory
    )
    if (mixin !== undefined) {
      if (tx._class !== core.class.TxRemoveDoc) {
        const factory = await getResource(mixin.factory)
        result.push(...(await factory(tx, control)))
      } else {
        const todos = await control.findAll(control.ctx, time.class.ToDo, { attachedTo: tx.objectId })
        result.push(...todos.map((p) => control.txFactory.createTxRemoveDoc(p._class, p.space, p._id)))
      }
    }
  }

  return result
}

export async function OnWorkSlotUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = tx as TxCUD<WorkSlot>
    if (!control.hierarchy.isDerived(actualTx.objectClass, time.class.WorkSlot)) {
      continue
    }
    if (!control.hierarchy.isDerived(actualTx._class, core.class.TxUpdateDoc)) {
      continue
    }
    const updTx = actualTx as TxUpdateDoc<WorkSlot>
    const visibility = updTx.operations.visibility
    if (visibility !== undefined) {
      const workslot = (
        await control.findAll(control.ctx, time.class.WorkSlot, { _id: updTx.objectId }, { limit: 1 })
      )[0]
      if (workslot === undefined) {
        continue
      }
      const todo = (await control.findAll(control.ctx, time.class.ToDo, { _id: workslot.attachedTo }))[0]
      result.push(control.txFactory.createTxUpdateDoc(todo._class, todo.space, todo._id, { visibility }))
    }
  }
  return result
}

export async function OnWorkSlotCreate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const actualTx = tx as TxCUD<WorkSlot>
    if (!control.hierarchy.isDerived(actualTx.objectClass, time.class.WorkSlot)) {
      continue
    }
    if (!control.hierarchy.isDerived(actualTx._class, core.class.TxCreateDoc)) {
      continue
    }
    const workslot = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<WorkSlot>)
    const workslots = await control.findAll(control.ctx, time.class.WorkSlot, { attachedTo: workslot.attachedTo })
    if (workslots.length > 1) {
      continue
    }
    const todo = (await control.findAll(control.ctx, time.class.ToDo, { _id: workslot.attachedTo }))[0]
    if (todo === undefined) {
      continue
    }
    if (!control.hierarchy.isDerived(todo.attachedToClass, tracker.class.Issue)) {
      continue
    }
    const issue = (await control.findAll(control.ctx, tracker.class.Issue, { _id: todo.attachedTo as Ref<Issue> }))[0]
    if (issue === undefined) {
      continue
    }
    const project = (await control.findAll(control.ctx, task.class.Project, { _id: issue.space }))[0]
    if (project !== undefined) {
      const type = (await control.modelDb.findAll(task.class.ProjectType, { _id: project.type }))[0]
      if (type?.classic) {
        const taskType = (await control.modelDb.findAll(task.class.TaskType, { _id: issue.kind }))[0]
        if (taskType !== undefined) {
          const statuses = await control.modelDb.findAll(core.class.Status, { _id: { $in: taskType.statuses } })
          const statusMap = toIdMap(statuses)
          const typeStatuses = taskType.statuses.map((p) => statusMap.get(p)).filter((p) => p !== undefined) as Status[]
          const current = statusMap.get(issue.status)
          if (current === undefined) {
            continue
          }
          if (current.category !== task.statusCategory.UnStarted && current.category !== task.statusCategory.ToDo) {
            continue
          }
          const nextStatus = typeStatuses.find((p) => p.category === task.statusCategory.Active)
          if (nextStatus !== undefined) {
            const factory = new TxFactory(control.txFactory.account)
            const innerTx = factory.createTxUpdateDoc(issue._class, issue.space, issue._id, {
              status: nextStatus._id
            })
            const outerTx = factory.createTxCollectionCUD(
              issue.attachedToClass,
              issue.attachedTo,
              issue.space,
              issue.collection,
              innerTx
            )
            await control.apply(control.ctx, [outerTx])
          }
        }
      }
    }
  }
  return []
}

export async function OnToDoRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  for (const tx of txes) {
    const actualTx = tx as TxCUD<ToDo>
    if (!control.hierarchy.isDerived(actualTx.objectClass, time.class.ToDo)) {
      continue
    }
    if (!control.hierarchy.isDerived(actualTx._class, core.class.TxRemoveDoc)) {
      continue
    }
    const todo = control.removedMap.get(actualTx.objectId) as ToDo
    if (todo === undefined) {
      continue
    }
    // it was closed, do nothing
    if (todo.doneOn != null) {
      continue
    }
    const todos = await control.findAll(control.ctx, time.class.ToDo, { attachedTo: todo.attachedTo })
    if (todos.length > 0) {
      continue
    }
    const issue = (await control.findAll(control.ctx, tracker.class.Issue, { _id: todo.attachedTo as Ref<Issue> }))[0]
    if (issue === undefined) {
      continue
    }
    const project = (await control.findAll(control.ctx, task.class.Project, { _id: issue.space }))[0]
    if (project !== undefined) {
      const type = (await control.modelDb.findAll(task.class.ProjectType, { _id: project.type }))[0]
      if (type !== undefined && type.classic) {
        const factory = new TxFactory(control.txFactory.account)
        const taskType = (await control.modelDb.findAll(task.class.TaskType, { _id: issue.kind }))[0]
        if (taskType !== undefined) {
          const statuses = await control.modelDb.findAll(core.class.Status, { _id: { $in: taskType.statuses } })
          const statusMap = toIdMap(statuses)
          const typeStatuses = taskType.statuses.map((p) => statusMap.get(p)).filter((p) => p !== undefined) as Status[]
          const current = statusMap.get(issue.status)
          if (current === undefined) {
            continue
          }
          if (current.category !== task.statusCategory.Active && current.category !== task.statusCategory.ToDo) {
            continue
          }
          const nextStatus = typeStatuses.find((p) => p.category === task.statusCategory.UnStarted)
          if (nextStatus !== undefined) {
            const innerTx = factory.createTxUpdateDoc(issue._class, issue.space, issue._id, {
              status: nextStatus._id
            })
            const outerTx = factory.createTxCollectionCUD(
              issue.attachedToClass,
              issue.attachedTo,
              issue.space,
              issue.collection,
              innerTx
            )
            await control.apply(control.ctx, [outerTx])
          }
        }
      }
    }
  }
  return []
}

export async function OnToDoCreate (txes: TxCUD<Doc>[], control: TriggerControl): Promise<Tx[]> {
  const hierarchy = control.hierarchy

  for (const tx of txes) {
    const createTx = tx as TxCreateDoc<ToDo>

    if (!hierarchy.isDerived(createTx.objectClass, time.class.ToDo)) {
      continue
    }
    if (!hierarchy.isDerived(createTx._class, core.class.TxCreateDoc)) {
      continue
    }

    const mixin = hierarchy.classHierarchyMixin(
      createTx.objectClass as Ref<Class<Doc>>,
      notification.mixin.ClassCollaborators
    )

    if (mixin === undefined) {
      continue
    }

    const todo = TxProcessor.createDoc2Doc(createTx)
    const object = (await control.findAll(control.ctx, todo.attachedToClass, { _id: todo.attachedTo }))[0]
    if (object === undefined) {
      continue
    }

    const objectSpace = hierarchy.isDerived(object._class, core.class.Space)
      ? (object as Space)
      : (await control.findAll<Space>(control.ctx, core.class.Space, { _id: object.space }))[0]

    if (objectSpace === undefined) {
      control.ctx.error('No space found', { objectId: object._id, objectClass: object._class, space: object.space })
      Analytics.handleError(
        new Error(`No space found for object ${object._id} of class ${object._class} and space ${object.space}`)
      )
      continue
    }

    const currentAcc = control.ctx.contextData.account

    if (
      !hierarchy.isDerived(objectSpace._class, core.class.SystemSpace) &&
      !includesAny(objectSpace.members, currentAcc.socialIds)
    ) {
      continue
    }

    const employee = (
      await control.findAll(
        control.ctx,
        contact.mixin.Employee,
        { _id: todo.user as Ref<Employee>, active: true },
        { limit: 1 }
      )
    )[0]
    if (employee === undefined) {
      continue
    }

    const personSpace = (
      await control.findAll(control.ctx, contact.class.PersonSpace, { person: todo.user }, { limit: 1 })
    )[0]
    if (personSpace === undefined) {
      continue
    }

    const socialStrings = await getSocialStrings(control, employee._id)
    const primarySocialString = pickPrimarySocialId(socialStrings)
    const account = employee.personUuid

    if (account == null) {
      continue
    }

    // TODO: Select a proper account
    const receiverInfo: ReceiverInfo = {
      _id: primarySocialString,
      person: employee,
      socialStrings,

      employee,
      account,
      space: personSpace._id
    }

    const senderPerson = await getPerson(control, tx.modifiedBy)
    const senderSocialStrings = await getAllSocialStringsByPersonId(control, [tx.modifiedBy])

    const senderInfo: SenderInfo = {
      _id: tx.modifiedBy,
      person: senderPerson,
      socialStrings: senderSocialStrings
    }
    const notificationControl = await getNotificationProviderControl(control.ctx, control)
    const notifyResult = await isShouldNotifyTx(
      control,
      createTx,
      todo,
      socialStrings,
      true,
      false,
      notificationControl
    )
    const content = await getNotificationContent(tx, socialStrings, senderInfo, todo, control)
    const data: Partial<Data<CommonInboxNotification>> = {
      ...content,
      header: time.string.ToDo,
      headerIcon: time.icon.Planned,
      headerObjectId: object._id,
      headerObjectClass: object._class,
      messageHtml: jsonToMarkup(nodeDoc(nodeParagraph(nodeText(todo.title))))
    }

    const txes = await getCommonNotificationTxes(
      control.ctx,
      control,
      object,
      data,
      receiverInfo,
      senderInfo,
      object._id,
      object._class,
      object.space,
      createTx.modifiedOn,
      notifyResult,
      notification.class.CommonInboxNotification,
      tx
    )

    await control.apply(control.ctx, txes)

    const ids = txes.map((it) => it._id)
    const personUuid = receiverInfo.person?.personUuid
    if (personUuid !== undefined) {
      control.ctx.contextData.broadcast.targets.notifications = (it) => {
        if (ids.includes(it._id)) {
          return [personUuid]
        }
      }
    }
  }
  return []
}

/**
 * @public
 */
export async function OnToDoUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const actualTx = tx as TxCUD<ToDo>
    if (!control.hierarchy.isDerived(actualTx.objectClass, time.class.ToDo)) {
      continue
    }
    if (!control.hierarchy.isDerived(actualTx._class, core.class.TxUpdateDoc)) {
      continue
    }
    const updTx = actualTx as TxUpdateDoc<ToDo>
    const doneOn = updTx.operations.doneOn
    const title = updTx.operations.title
    const description = updTx.operations.description
    const visibility = updTx.operations.visibility
    if (doneOn != null) {
      const events = await control.findAll(control.ctx, time.class.WorkSlot, { attachedTo: updTx.objectId })
      const resEvents: WorkSlot[] = []
      for (const event of events) {
        if (event.date > doneOn) {
          const innerTx = control.txFactory.createTxRemoveDoc(event._class, event.space, event._id)
          const outerTx = control.txFactory.createTxCollectionCUD(
            event.attachedToClass,
            event.attachedTo,
            event.space,
            event.collection,
            innerTx
          )
          result.push(outerTx)
        } else if (event.dueDate > doneOn) {
          const upd: DocumentUpdate<WorkSlot> = {
            dueDate: doneOn
          }
          if (title !== undefined) {
            upd.title = title
          }
          if (description !== undefined) {
            upd.description = description
          }
          const innerTx = control.txFactory.createTxUpdateDoc(event._class, event.space, event._id, upd)
          const outerTx = control.txFactory.createTxCollectionCUD(
            event.attachedToClass,
            event.attachedTo,
            event.space,
            event.collection,
            innerTx
          )
          result.push(outerTx)
          resEvents.push({
            ...event,
            dueDate: doneOn
          })
        } else {
          resEvents.push(event)
        }
      }
      const todo = (await control.findAll(control.ctx, time.class.ToDo, { _id: updTx.objectId }))[0]
      if (todo === undefined) {
        continue
      }
      const funcs = control.hierarchy.classHierarchyMixin<Class<Doc>, OnToDo>(
        todo.attachedToClass,
        serverTime.mixin.OnToDo
      )
      if (funcs !== undefined) {
        const func = await getResource(funcs.onDone)
        const todoRes = await func(control, resEvents, todo, tx.space === core.space.DerivedTx)
        await control.apply(control.ctx, todoRes)
      }
      continue
    }
    if (title !== undefined || description !== undefined || visibility !== undefined) {
      const events = await control.findAll(control.ctx, time.class.WorkSlot, { attachedTo: updTx.objectId })
      for (const event of events) {
        const upd: DocumentUpdate<WorkSlot> = {}
        if (title !== undefined) {
          upd.title = title
        }
        if (description !== undefined) {
          upd.description = description
        }
        if (visibility !== undefined) {
          const newVisibility = visibility === 'public' ? 'public' : 'freeBusy'
          if (event.visibility !== newVisibility) {
            upd.visibility = newVisibility
          }
        }
        const innerTx = control.txFactory.createTxUpdateDoc(event._class, event.space, event._id, upd)
        const outerTx = control.txFactory.createTxCollectionCUD(
          event.attachedToClass,
          event.attachedTo,
          event.space,
          event.collection,
          innerTx
        )
        result.push(outerTx)
      }
    }
  }
  return result
}

/**
 * @public
 */
export async function IssueToDoFactory (actualTx: TxCUD<Issue>, control: TriggerControl): Promise<Tx[]> {
  if (!control.hierarchy.isDerived(actualTx.objectClass, tracker.class.Issue)) return []
  if (control.hierarchy.isDerived(actualTx._class, core.class.TxCreateDoc)) {
    const issue = TxProcessor.createDoc2Doc(actualTx as TxCreateDoc<Issue>)
    return await createIssueHandler(issue, control)
  } else if (control.hierarchy.isDerived(actualTx._class, core.class.TxUpdateDoc)) {
    const updateTx = actualTx as TxUpdateDoc<Issue>
    return await updateIssueHandler(updateTx, control)
  }
  return []
}

async function generateChangeStatusTx (
  control: TriggerControl,
  factory: TxFactory,
  issue: Issue,
  todo: ToDo
): Promise<Tx | undefined> {
  if (await isClassic(control, issue.space)) {
    const taskType = (await control.modelDb.findAll(task.class.TaskType, { _id: issue.kind }))[0]
    if (taskType !== undefined) {
      const index = taskType.statuses.findIndex((p) => p === issue.status)
      const nextStatus = taskType.statuses[index + 1]
      const currentStatus = taskType.statuses[index]

      const current = await getStatus(control, currentStatus)
      const next = await getStatus(control, nextStatus)
      if (isValidStatusChange(current, next)) {
        const unfinished = await getUnfinishedTodos(control, issue._id)
        if (unfinished.length > 0) return

        const testers = await getTesters(control)
        for (const tester of testers) {
          if (!(await tester(control, todo))) {
            return
          }
        }

        return createStatusChangeTx(factory, issue, nextStatus)
      }
    }
  }
}

async function isClassic (control: TriggerControl, space: Ref<Project>): Promise<boolean> {
  const project = (await control.findAll(control.ctx, tracker.class.Project, { _id: space }))[0]
  const projectType = (await control.modelDb.findAll(task.class.ProjectType, { _id: project.type }))[0]
  return projectType?.classic ?? false
}

async function getUnfinishedTodos (control: TriggerControl, issueId: Ref<Issue>): Promise<ToDo[]> {
  return await control.findAll(control.ctx, time.class.ToDo, { attachedTo: issueId, doneOn: null }, { limit: 1 })
}

async function getTesters (
  control: TriggerControl
): Promise<((control: TriggerControl, todo: ToDo) => Promise<boolean>)[]> {
  const helpers = await control.modelDb.findAll<TodoAutomationHelper>(time.class.TodoAutomationHelper, {})
  return await Promise.all(helpers.map((it) => getResource(it.onDoneTester)))
}

async function getStatus (control: TriggerControl, statusId: Ref<Status> | undefined): Promise<Status | undefined> {
  if (statusId === undefined) return
  return (await control.modelDb.findAll(core.class.Status, { _id: statusId }))[0]
}

function isValidStatusChange (current: Status | undefined, next: Status | undefined): boolean {
  if (current === undefined || next === undefined) return false
  return (
    current.category !== task.statusCategory.Lost &&
    next.category !== task.statusCategory.Lost &&
    current.category !== task.statusCategory.Won
  )
}

function createStatusChangeTx (factory: TxFactory, issue: Issue, nextStatus: Ref<Status>): Tx {
  const innerTx = factory.createTxUpdateDoc(issue._class, issue.space, issue._id, {
    status: nextStatus
  })
  return factory.createTxCollectionCUD(issue.attachedToClass, issue.attachedTo, issue.space, issue.collection, innerTx)
}

/**
 * @public
 */
export async function IssueToDoDone (
  control: TriggerControl,
  workslots: WorkSlot[],
  todo: ToDo,
  isDerived: boolean
): Promise<Tx[]> {
  const res: Tx[] = []
  let total = 0
  for (const workslot of workslots) {
    total += (workslot.dueDate - workslot.date) / 1000 / 60
  }
  const factory = new TxFactory(control.txFactory.account)
  const issue = (
    await control.findAll<Issue>(control.ctx, todo.attachedToClass, { _id: todo.attachedTo as Ref<Issue> })
  )[0]
  if (issue !== undefined) {
    if (!isDerived) {
      const changeTx = await generateChangeStatusTx(control, factory, issue, todo)
      if (changeTx !== undefined) {
        res.push(changeTx)
      }
    }
    if (total > 0) {
      // round to nearest 15 minutes
      total = Math.round(total / 15) * 15

      const data: AttachedData<TimeSpendReport> = {
        employee: todo.user as Ref<Employee>,
        date: new Date().getTime(),
        value: total / 60,
        description: ''
      }
      const innerTx = factory.createTxCreateDoc(
        tracker.class.TimeSpendReport,
        issue.space,
        data as Data<TimeSpendReport>
      )
      const outerTx = factory.createTxCollectionCUD(issue._class, issue._id, issue.space, 'reports', innerTx)
      res.push(outerTx)
    }
  }
  return res
}

async function createIssueHandler (issue: Issue, control: TriggerControl): Promise<Tx[]> {
  if (issue.assignee != null) {
    const project = (await control.findAll(control.ctx, task.class.Project, { _id: issue.space }))[0]
    if (project === undefined) return []
    const type = (await control.modelDb.findAll(task.class.ProjectType, { _id: project.type }))[0]
    if (!type?.classic) return []
    const status = (await control.modelDb.findAll(core.class.Status, { _id: issue.status }))[0]
    if (status === undefined) return []
    if (status.category === task.statusCategory.Active || status.category === task.statusCategory.ToDo) {
      const tx = await getCreateToDoTx(issue, issue.assignee, control)
      if (tx !== undefined) {
        await control.apply(control.ctx, [tx])
      }
    }
  }
  return []
}

async function getIssueToDoData (
  issue: Issue,
  user: Ref<Person>,
  control: TriggerControl
): Promise<AttachedData<ProjectToDo> | undefined> {
  const firstTodoItem = (
    await control.findAll(
      control.ctx,
      time.class.ToDo,
      {
        user,
        doneOn: null
      },
      {
        limit: 1,
        sort: { rank: SortingOrder.Ascending }
      }
    )
  )[0]
  const rank = makeRank(undefined, firstTodoItem?.rank)
  const data: AttachedData<ProjectToDo> = {
    attachedSpace: issue.space,
    workslots: 0,
    description: '',
    priority: ToDoPriority.NoPriority,
    visibility: 'public',
    title: issue.title,
    user,
    rank
  }
  return data
}

async function getCreateToDoTx (issue: Issue, user: Ref<Person>, control: TriggerControl): Promise<Tx | undefined> {
  const data = await getIssueToDoData(issue, user, control)
  if (data === undefined) return
  const innerTx = control.txFactory.createTxCreateDoc(
    time.class.ProjectToDo,
    time.space.ToDos,
    data as Data<ProjectToDo>
  )
  innerTx.space = core.space.Tx
  const outerTx = control.txFactory.createTxCollectionCUD(issue._class, issue._id, time.space.ToDos, 'todos', innerTx)
  outerTx.space = core.space.Tx
  return outerTx
}

async function changeIssueAssigneeHandler (
  control: TriggerControl,
  newAssignee: Ref<Person>,
  issueId: Ref<Issue>
): Promise<Tx[]> {
  const issue = (await control.findAll(control.ctx, tracker.class.Issue, { _id: issueId }))[0]
  if (issue !== undefined) {
    const status = (await control.modelDb.findAll(core.class.Status, { _id: issue.status }))[0]
    if (status === undefined) return []
    if (status.category === task.statusCategory.Active || status.category === task.statusCategory.ToDo) {
      const res: Tx[] = []
      const todos = await control.findAll(control.ctx, time.class.ToDo, {
        attachedTo: issue._id
      })
      const now = Date.now()
      for (const todo of todos) {
        if (todo.doneOn != null) continue
        res.push(control.txFactory.createTxUpdateDoc(todo._class, todo.space, todo._id, { doneOn: now }))
      }
      const tx = await getCreateToDoTx(issue, newAssignee, control)
      if (tx !== undefined) {
        res.push(tx)
      }
      return res
    }
  }
  return []
}

async function changeIssueStatusHandler (
  control: TriggerControl,
  newStatus: Ref<IssueStatus>,
  issueId: Ref<Issue>
): Promise<Tx[]> {
  const status = (await control.modelDb.findAll(core.class.Status, { _id: newStatus }))[0]
  if (status === undefined) return []
  if (status.category === task.statusCategory.Active || status.category === task.statusCategory.ToDo) {
    const issue = (await control.findAll(control.ctx, tracker.class.Issue, { _id: issueId }))[0]
    if (issue?.assignee != null) {
      const todos = await control.findAll(control.ctx, time.class.ToDo, {
        attachedTo: issue._id,
        user: issue.assignee
      })
      if (todos.length === 0) {
        const tx = await getCreateToDoTx(issue, issue.assignee, control)
        if (tx !== undefined) {
          await control.apply(control.ctx, [tx])
        }
      }
    }
  } else if (status.category === task.statusCategory.Won || status.category === task.statusCategory.Lost) {
    const issue = (await control.findAll(control.ctx, tracker.class.Issue, { _id: issueId }))[0]
    if (issue !== undefined) {
      const todos = await control.findAll(control.ctx, time.class.ToDo, {
        attachedTo: issue._id,
        doneOn: null
      })
      const res: Tx[] = []
      const now = Date.now()
      for (const todo of todos) {
        if (todo.doneOn == null) {
          res.push(control.txFactory.createTxUpdateDoc(todo._class, todo.space, todo._id, { doneOn: now }))
        }
      }
      return res
    }
  }
  return []
}

async function changeIssueDataHandler (control: TriggerControl, issueId: Ref<Issue>): Promise<Tx[]> {
  const res: Tx[] = []
  const issue = (await control.findAll(control.ctx, tracker.class.Issue, { _id: issueId }))[0]
  if (issue !== undefined) {
    const todos = await control.findAll(control.ctx, time.class.ToDo, {
      attachedTo: issue._id
    })
    for (const todo of todos) {
      const data = await getIssueToDoData(issue, todo.user, control)
      if (data === undefined) continue
      const update: DocumentUpdate<ToDo> = {}
      if (data.title !== todo.title) {
        update.title = data.title
      }
      if (data.attachedSpace !== todo.attachedSpace) {
        update.attachedSpace = data.attachedSpace
      }
      if (Object.keys(update).length > 0) {
        const innerTx = control.txFactory.createTxUpdateDoc(todo._class, todo.space, todo._id, update)
        const outerTx = control.txFactory.createTxCollectionCUD(
          issue._class,
          issue._id,
          time.space.ToDos,
          'todos',
          innerTx
        )
        res.push(outerTx)
      }
    }
  }
  return res
}

async function updateIssueHandler (tx: TxUpdateDoc<Issue>, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []
  const project = (await control.findAll(control.ctx, task.class.Project, { _id: tx.objectSpace as Ref<Project> }))[0]
  if (project === undefined) return []
  const type = (await control.modelDb.findAll(task.class.ProjectType, { _id: project.type }))[0]
  if (!type?.classic) return []
  const newAssignee = tx.operations.assignee
  if (newAssignee != null) {
    res.push(...(await changeIssueAssigneeHandler(control, newAssignee, tx.objectId)))
  }
  const newStatus = tx.operations.status
  if (newStatus !== undefined) {
    res.push(...(await changeIssueStatusHandler(control, newStatus, tx.objectId)))
  }
  const name = tx.operations.title
  const space = tx.operations.space
  if (space !== undefined || name !== undefined) {
    res.push(...(await changeIssueDataHandler(control, tx.objectId)))
  }
  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    IssueToDoFactory,
    IssueToDoDone
  },
  trigger: {
    OnTask,
    OnToDoUpdate,
    OnToDoRemove,
    OnToDoCreate,
    OnWorkSlotCreate,
    OnWorkSlotUpdate
  }
})
