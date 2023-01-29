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

import { Employee } from '@hcengineering/contact'
import core, { AttachedDoc, Doc, Ref, Tx, TxCollectionCUD, TxProcessor, TxUpdateDoc } from '@hcengineering/core'
import login from '@hcengineering/login'
import { NotificationAction } from '@hcengineering/notification'
import { getMetadata, Resource } from '@hcengineering/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { getEmployeeAccount, getEmployeeAccountById, getUpdateLastViewTx } from '@hcengineering/server-notification'
import { createNotificationTxes } from '@hcengineering/server-notification-resources'
import task, { Issue, Task, taskId } from '@hcengineering/task'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

/**
 * @public
 */
export async function issueHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const issue = doc as Issue
  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  return `<a href="${front}/${workbenchId}/${control.workspace.name}/${taskId}/${issue.space}/#${view.component.EditDoc}|${issue._id}|${issue._class}|content">Task-${issue.number}</a>`
}

/**
 * @public
 */
export async function issueTextPresenter (doc: Doc): Promise<string> {
  const issue = doc as Issue
  return `Task-${issue.number}`
}

/**
 * @public
 */
export async function addAssigneeNotification (
  control: TriggerControl,
  res: Tx[],
  issue: Doc,
  assignee: Ref<Employee>,
  ptx: TxCollectionCUD<AttachedDoc, AttachedDoc>,
  component?: Resource<string>
): Promise<void> {
  const sender = await getEmployeeAccountById(ptx.modifiedBy, control)
  if (sender === undefined) {
    return
  }

  const receiver = await getEmployeeAccount(assignee, control)
  if (receiver === undefined) {
    return
  }

  // eslint-disable-next-line
  const action: NotificationAction = {
    component: component ?? view.component.EditDoc,
    objectId: issue._id,
    objectClass: issue._class
  } as NotificationAction

  const result = await createNotificationTxes(
    control,
    ptx,
    task.ids.AssigneedNotification,
    issue,
    sender,
    receiver,
    undefined,
    action
  )

  res.push(...result)
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
