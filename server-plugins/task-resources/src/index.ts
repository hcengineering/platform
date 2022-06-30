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

import core, { Doc, Tx, TxUpdateDoc } from '@anticrm/core'
import login from '@anticrm/login'
import { getMetadata } from '@anticrm/platform'
import { extractTx, TriggerControl } from '@anticrm/server-core'
import { getUpdateLastViewTx } from '@anticrm/server-notification'
import task, { Issue, Task, taskId } from '@anticrm/task'
import view from '@anticrm/view'
import { workbenchId } from '@anticrm/workbench'

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
export async function OnTaskUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = extractTx(tx)
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
