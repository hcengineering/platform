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

import core, { AttachedData, Tx, TxUpdateDoc } from '@anticrm/core'
import { extractTx, TriggerControl } from '@anticrm/server-core'
import tracker, { Issue } from '@anticrm/tracker'

async function updateSubIssues (
  control: TriggerControl,
  node: Issue,
  update: Partial<AttachedData<Issue>>,
  shouldSkip = false
): Promise<TxUpdateDoc<Issue>[]> {
  let txes: TxUpdateDoc<Issue>[] = []

  if (!shouldSkip && Object.entries(update).some(([key, value]) => value !== node[key as keyof Issue])) {
    txes.push(control.txFactory.createTxUpdateDoc(node._class, node.space, node._id, update))
  }

  if (node.subIssues > 0) {
    const subIssues = await control.findAll(tracker.class.Issue, { attachedTo: node._id })

    for (const subIssue of subIssues) {
      txes = txes.concat(await updateSubIssues(control, subIssue, update))
    }
  }

  return txes
}

/**
 * @public
 */
export async function OnIssueProjectUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = extractTx(tx)
  if (actualTx._class !== core.class.TxUpdateDoc) {
    return []
  }

  const updateTx = actualTx as TxUpdateDoc<Issue>
  if (!control.hierarchy.isDerived(updateTx.objectClass, tracker.class.Issue)) {
    return []
  }

  if (!Object.prototype.hasOwnProperty.call(updateTx.operations, 'project')) {
    return []
  }

  const update: Partial<AttachedData<Issue>> = { project: updateTx.operations.project ?? null }
  const [node] = await control.findAll(
    updateTx.objectClass,
    { _id: updateTx.objectId, subIssues: { $gt: 0 } },
    { limit: 1 }
  )
  return node !== undefined ? await updateSubIssues(control, node, update, true) : []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnIssueProjectUpdate
  }
})
