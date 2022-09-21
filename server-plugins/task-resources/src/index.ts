//
// Copyright © 2022 Hardcore Engineering Inc.
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

import contact, { Employee, EmployeeAccount, formatName } from '@hcengineering/contact'
import core, {
  Account,
  AttachedDoc,
  Data,
  Doc,
  generateId,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxProcessor,
  TxUpdateDoc
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { getMetadata } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { getUpdateLastViewTx } from '@hcengineering/server-notification'
import task, { Issue, Task, taskId } from '@hcengineering/task'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'
import notification, { Notification, NotificationStatus } from '@hcengineering/notification'

/**
 * @public
 */
export function issueHTMLPresenter (doc: Doc): string {
  const issue = doc as Issue
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${taskId}/${issue.space}/#${view.component.EditDoc}|${issue._id}|${issue._class}">Task-${issue.number}</a>`
}

/**
 * @public
 */
export function issueTextPresenter (doc: Doc): string {
  const issue = doc as Issue
  return `Task-${issue.number}`
}

/**
 * @public
 */
export async function getEmployeeAccount (
  employee: Ref<Account>,
  control: TriggerControl
): Promise<EmployeeAccount | undefined> {
  const account = (
    await control.modelDb.findAll(
      contact.class.EmployeeAccount,
      {
        _id: employee as Ref<EmployeeAccount>
      },
      { limit: 1 }
    )
  )[0]
  return account
}

async function getEmployee (employee: Ref<Employee>, control: TriggerControl): Promise<Employee | undefined> {
  const account = (
    await control.findAll(
      contact.class.Employee,
      {
        _id: employee
      },
      { limit: 1 }
    )
  )[0]
  return account
}

/**
 * @public
 */
export async function addAssigneeNotification (
  control: TriggerControl,
  res: Tx[],
  issue: Doc,
  issueName: string,
  assignee: Ref<Employee>,
  ptx: TxCollectionCUD<AttachedDoc, AttachedDoc>
): Promise<void> {
  const sender = await getEmployeeAccount(ptx.modifiedBy, control)
  if (sender === undefined) {
    return
  }

  const target = await getEmployee(assignee, control)
  if (target === undefined) {
    return
  }

  const createTx: TxCreateDoc<Notification> = {
    objectClass: notification.class.Notification,
    objectSpace: notification.space.Notifications,
    objectId: generateId(),
    modifiedOn: ptx.modifiedOn,
    modifiedBy: ptx.modifiedBy,
    space: ptx.space,
    _id: generateId(),
    _class: core.class.TxCreateDoc,
    attributes: {
      tx: ptx._id,
      status: NotificationStatus.New,
      type: task.ids.AssigneedNotification,
      text: `${issueName} was assigned to you by ${formatName(sender.name)}`
    } as unknown as Data<Notification>
  }

  res.push(control.txFactory.createTxCollectionCUD(target._class, target._id, target.space, 'notifications', createTx))
}

/**
 * @public
 */
export async function OnTaskUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  if (actualTx._class !== core.class.TxUpdateDoc) {
    return []
  }

  const updateTx = actualTx as TxUpdateDoc<Task>

  if (!control.hierarchy.isDerived(updateTx.objectClass, task.class.Task)) {
    return []
  }
  const txes: Tx[] = []

  const mainTx = await getUpdateLastViewTx(
    control.findAll,
    updateTx.objectId,
    updateTx.objectClass,
    updateTx.modifiedOn,
    updateTx.modifiedBy
  )
  if (mainTx !== undefined) {
    txes.push(mainTx)
  }
  if (updateTx.operations.assignee != null) {
    const assignee = (
      await control.modelDb.findAll(core.class.Account, { emoloyee: updateTx.operations.assignee }, { limit: 1 })
    )[0]
    if (assignee !== undefined) {
      const assigneeTx = await getUpdateLastViewTx(
        control.findAll,
        updateTx.objectId,
        updateTx.objectClass,
        updateTx.modifiedOn,
        assignee._id
      )
      if (assigneeTx !== undefined) {
        txes.push(assigneeTx)
      }
    }
  }

  return txes
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    IssueHTMLPresenter: issueHTMLPresenter,
    IssueTextPresenter: issueTextPresenter
  }
})
