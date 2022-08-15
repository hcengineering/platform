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

import core, {
  DocumentUpdate,
  Ref,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxUpdateDoc
} from '@anticrm/core'
import { TriggerControl } from '@anticrm/server-core'
import tracker, { Issue, TimeSpendReport } from '@anticrm/tracker'

async function updateSubIssues (
  updateTx: TxUpdateDoc<Issue>,
  control: TriggerControl,
  update: DocumentUpdate<Issue> | ((node: Issue) => DocumentUpdate<Issue>)
): Promise<TxUpdateDoc<Issue>[]> {
  const subIssues = await control.findAll(tracker.class.Issue, { 'parents.parentId': updateTx.objectId })

  return subIssues.map((issue) => {
    const docUpdate = typeof update === 'function' ? update(issue) : update
    return control.txFactory.createTxUpdateDoc(issue._class, issue.space, issue._id, docUpdate)
  })
}

/**
 * @public
 */
export async function OnIssueUpdate (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)

  // Check TimeReport operations
  if (
    actualTx._class === core.class.TxCreateDoc ||
    actualTx._class === core.class.TxUpdateDoc ||
    actualTx._class === core.class.TxRemoveDoc
  ) {
    const cud = actualTx as TxCUD<TimeSpendReport>
    if (cud.objectClass === tracker.class.TimeSpendReport) {
      return await doTimeReportUpdate(cud, tx, control)
    }
  }

  if (actualTx._class !== core.class.TxUpdateDoc) {
    return []
  }

  const updateTx = actualTx as TxUpdateDoc<Issue>
  if (control.hierarchy.isDerived(updateTx.objectClass, tracker.class.Issue)) {
    return await doIssueUpdate(updateTx, control)
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  trigger: {
    OnIssueUpdate
  }
})

async function doTimeReportUpdate (cud: TxCUD<TimeSpendReport>, tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const parentTx = tx as TxCollectionCUD<Issue, TimeSpendReport>
  switch (cud._class) {
    case core.class.TxCreateDoc: {
      const ccud = cud as TxCreateDoc<TimeSpendReport>
      return [
        control.txFactory.createTxUpdateDoc<Issue>(parentTx.objectClass, parentTx.objectSpace, parentTx.objectId, {
          $inc: { reportedTime: ccud.attributes.value }
        })
      ]
    }
    case core.class.TxUpdateDoc: {
      const upd = cud as TxUpdateDoc<TimeSpendReport>
      if (upd.operations.value !== undefined) {
        const logTxes = Array.from(
          await control.findAll(core.class.TxCollectionCUD, {
            'tx.objectId': cud.objectId,
            _id: { $nin: [parentTx._id] }
          })
        ).map(TxProcessor.extractTx)
        const doc: TimeSpendReport | undefined = TxProcessor.buildDoc2Doc(logTxes)
        if (doc !== undefined) {
          return [
            control.txFactory.createTxUpdateDoc<Issue>(parentTx.objectClass, parentTx.objectSpace, parentTx.objectId, {
              $inc: { reportedTime: -1 * doc.value }
            }),
            control.txFactory.createTxUpdateDoc<Issue>(parentTx.objectClass, parentTx.objectSpace, parentTx.objectId, {
              $inc: { reportedTime: upd.operations.value }
            })
          ]
        }
      }
      break
    }
    case core.class.TxRemoveDoc: {
      const logTxes = Array.from(
        await control.findAll(core.class.TxCollectionCUD, {
          'tx.objectId': cud.objectId,
          _id: { $nin: [parentTx._id] }
        })
      ).map(TxProcessor.extractTx)
      const doc: TimeSpendReport | undefined = TxProcessor.buildDoc2Doc(logTxes)
      if (doc !== undefined) {
        return [
          control.txFactory.createTxUpdateDoc<Issue>(parentTx.objectClass, parentTx.objectSpace, parentTx.objectId, {
            $inc: { reportedTime: -1 * doc.value }
          })
        ]
      }
    }
  }
  return []
}

async function doIssueUpdate (updateTx: TxUpdateDoc<Issue>, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []

  if (Object.prototype.hasOwnProperty.call(updateTx.operations, 'attachedTo')) {
    const [newParent] = await control.findAll(
      tracker.class.Issue,
      { _id: updateTx.operations.attachedTo as Ref<Issue> },
      { limit: 1 }
    )
    const updatedProject = newParent !== undefined ? newParent.project : null
    const updatedParents =
      newParent !== undefined ? [{ parentId: newParent._id, parentTitle: newParent.title }, ...newParent.parents] : []

    function update (issue: Issue): DocumentUpdate<Issue> {
      const parentInfoIndex = issue.parents.findIndex(({ parentId }) => parentId === updateTx.objectId)
      const parentsUpdate =
        parentInfoIndex === -1
          ? {}
          : { parents: [...issue.parents].slice(0, parentInfoIndex + 1).concat(updatedParents) }

      return { ...parentsUpdate, project: updatedProject }
    }

    res.push(
      control.txFactory.createTxUpdateDoc(updateTx.objectClass, updateTx.objectSpace, updateTx.objectId, {
        parents: updatedParents,
        project: updatedProject
      }),
      ...(await updateSubIssues(updateTx, control, update))
    )
  }

  if (Object.prototype.hasOwnProperty.call(updateTx.operations, 'project')) {
    res.push(...(await updateSubIssues(updateTx, control, { project: updateTx.operations.project })))
  }

  if (Object.prototype.hasOwnProperty.call(updateTx.operations, 'title')) {
    function update (issue: Issue): DocumentUpdate<Issue> {
      const parentInfoIndex = issue.parents.findIndex(({ parentId }) => parentId === updateTx.objectId)
      const updatedParentInfo = { ...issue.parents[parentInfoIndex], parentTitle: updateTx.operations.title as string }
      const updatedParents = [...issue.parents]

      updatedParents[parentInfoIndex] = updatedParentInfo

      return { parents: updatedParents }
    }

    res.push(...(await updateSubIssues(updateTx, control, update)))
  }

  return res
}
