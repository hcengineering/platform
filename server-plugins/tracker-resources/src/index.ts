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
import { arrayEquals } from './utils'

async function updateSubIssuesData (
  control: TriggerControl,
  node: Issue,
  update: Partial<AttachedData<Issue>> | ((node: Issue) => Partial<AttachedData<Issue>>),
  shouldSkip = false
): Promise<TxUpdateDoc<Issue>[]> {
  let txes: TxUpdateDoc<Issue>[] = []

  if (!shouldSkip) {
    const docUpdate = typeof update === 'function' ? update(node) : update
    const shouldUpdate = Object.entries(docUpdate).some(([key, value]) => {
      return Array.isArray(value)
        ? !arrayEquals(value, node[key as keyof Issue] as typeof value)
        : value !== node[key as keyof Issue]
    })

    if (shouldUpdate) {
      txes.push(control.txFactory.createTxUpdateDoc(node._class, node.space, node._id, docUpdate))
    }
  }

  if (node.subIssues > 0) {
    const subIssues = await control.findAll(tracker.class.Issue, { attachedTo: node._id })

    for (const subIssue of subIssues) {
      txes = txes.concat(await updateSubIssuesData(control, subIssue, update))
    }
  }

  return txes
}

async function updateSubIssues (updateTx: TxUpdateDoc<Issue>, control: TriggerControl): Promise<TxUpdateDoc<Issue>[]> {
  const [node] = await control.findAll(
    updateTx.objectClass,
    { _id: updateTx.objectId, subIssues: { $gt: 0 } },
    { limit: 1 }
  )

  if (node === undefined) {
    return []
  }

  const projectUpdate = updateTx.operations.project !== undefined ? { project: updateTx.operations.project } : {}
  let update: Partial<AttachedData<Issue>> | ((node: Issue) => Partial<AttachedData<Issue>>)

  if (updateTx.operations.title !== undefined) {
    update = ({ parentNames }: Issue): Partial<AttachedData<Issue>> => {
      const NODE_OWN_NAME = 1
      const targetIndex = parentNames.length - (node.parentNames.length + NODE_OWN_NAME)
      const updatedNames = [...parentNames]

      updatedNames[targetIndex] = updateTx.operations.title as string

      return { ...projectUpdate, parentNames: updatedNames }
    }
  } else {
    update = projectUpdate
  }

  return await updateSubIssuesData(control, node, update, true)
}

async function changeIssueParent (updateTx: TxUpdateDoc<Issue>, control: TriggerControl): Promise<TxUpdateDoc<Issue>[]> {
  const [node] = await control.findAll(
    updateTx.objectClass,
    { _id: updateTx.objectId },
    { limit: 1, lookup: { attachedTo: tracker.class.Issue } }
  )

  if (node === undefined) {
    return []
  }

  const { length: oldParentNamesLength } = node.parentNames
  const newParentIssue = node.$lookup?.attachedTo as Issue | undefined
  const newParentNames = newParentIssue !== undefined ? [newParentIssue.title, ...newParentIssue?.parentNames] : []

  function update (node: Issue): Partial<AttachedData<Issue>> {
    const updatedNames = [...node.parentNames]
    const startIndex = oldParentNamesLength === 0 ? node.parentNames.length : -oldParentNamesLength

    updatedNames.splice(startIndex, oldParentNamesLength, ...newParentNames)

    return { parentNames: updatedNames }
  }

  return await updateSubIssuesData(control, node, update)
}

/**
 * @public
 */
export async function OnIssueUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = extractTx(tx)
  if (actualTx._class !== core.class.TxUpdateDoc) {
    return []
  }

  const updateTx = actualTx as TxUpdateDoc<Issue>
  if (!control.hierarchy.isDerived(updateTx.objectClass, tracker.class.Issue)) {
    return []
  }

  const res: Tx[] = []

  if (Object.prototype.hasOwnProperty.call(updateTx.operations, 'attachedTo')) {
    res.push(...(await changeIssueParent(updateTx, control)))
  }

  if (
    Object.prototype.hasOwnProperty.call(updateTx.operations, 'project') ||
    Object.prototype.hasOwnProperty.call(updateTx.operations, 'title')
  ) {
    res.push(...(await updateSubIssues(updateTx, control)))
  }

  return res
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnIssueUpdate
  }
})
