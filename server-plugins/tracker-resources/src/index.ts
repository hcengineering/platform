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
import core, {
  AttachedDoc,
  concatLink,
  Doc,
  DocumentUpdate,
  Ref,
  Space,
  Tx,
  TxCollectionCUD,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  WithLookup
} from '@hcengineering/core'
import login from '@hcengineering/login'
import { workbenchId } from '@hcengineering/workbench'
import { getMetadata } from '@hcengineering/platform'
import { Resource } from '@hcengineering/platform/lib/platform'
import { TriggerControl } from '@hcengineering/server-core'
import { addAssigneeNotification } from '@hcengineering/server-task-resources'
import tracker, { Issue, IssueParentInfo, Project, TimeSpendReport, trackerId } from '@hcengineering/tracker'

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
export async function issueHTMLPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const issue = doc as Issue
  const team = (await control.findAll(tracker.class.Team, { _id: issue.space })).shift()
  const issueName = `${team?.identifier ?? '?'}-${issue.number}`

  const front = getMetadata(login.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.name}/${trackerId}/${issue.space}/#${tracker.component.EditIssue}|${issue._id}|${issue._class}|content`
  const link = concatLink(front, path)
  return `<a href="${link}">${issueName}</a>`
}

/**
 * @public
 */
export async function issueTextPresenter (doc: Doc, control: TriggerControl): Promise<string> {
  const issue = doc as Issue
  const team = (await control.findAll(tracker.class.Team, { _id: issue.space })).shift()
  const issueName = `${team?.identifier ?? '?'}-${issue.number}`

  return issueName
}

/**
 * @public
 */
export async function addTrackerAssigneeNotification (
  control: TriggerControl,
  res: Tx[],
  issue: Issue,
  assignee: Ref<Employee>,
  ptx: TxCollectionCUD<Issue, AttachedDoc>
): Promise<void> {
  await addAssigneeNotification(
    control,
    res,
    issue,
    assignee,
    ptx,
    tracker.component.EditIssue as unknown as Resource<string>
  )
}

/**
 * @public
 */
export async function OnProjectRemove (tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const actualTx = TxProcessor.extractTx(tx)
  if (actualTx._class !== core.class.TxRemoveDoc) {
    return []
  }

  const ctx = actualTx as TxUpdateDoc<Project>

  const issues = await control.findAll(tracker.class.Issue, {
    project: ctx.objectId
  })
  if (issues === undefined) return []
  const res: Tx[] = []

  for (const issue of issues) {
    const issuePush = {
      ...issue,
      project: null
    }
    const tx = control.txFactory.createTxUpdateDoc(issue._class, issue.space, issue._id, issuePush)
    res.push(tx)
  }
  return res
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

  if (actualTx._class === core.class.TxCreateDoc) {
    const createTx = actualTx as TxCreateDoc<Issue>
    if (control.hierarchy.isDerived(createTx.objectClass, tracker.class.Issue)) {
      const issue = TxProcessor.createDoc2Doc(createTx)
      const res: Tx[] = []
      await updateIssueParentEstimations(issue, res, control, [], issue.parents)

      if (issue.assignee != null) {
        await addTrackerAssigneeNotification(
          control,
          res,
          issue,
          issue.assignee,
          tx as TxCollectionCUD<Issue, AttachedDoc>
        )
      }
      return res
    }
  }

  if (actualTx._class === core.class.TxUpdateDoc) {
    const updateTx = actualTx as TxUpdateDoc<Issue>
    if (control.hierarchy.isDerived(updateTx.objectClass, tracker.class.Issue)) {
      return await doIssueUpdate(updateTx, control, tx as TxCollectionCUD<Issue, AttachedDoc>)
    }
  }
  if (actualTx._class === core.class.TxRemoveDoc) {
    const removeTx = actualTx as TxRemoveDoc<Issue>
    if (control.hierarchy.isDerived(removeTx.objectClass, tracker.class.Issue)) {
      const parentIssue = await control.findAll(tracker.class.Issue, {
        'childInfo.childId': removeTx.objectId
      })
      const res: Tx[] = []
      const parents: IssueParentInfo[] = parentIssue.map((it) => ({ parentId: it._id, parentTitle: it.title }))
      await updateIssueParentEstimations(
        {
          _id: removeTx.objectId,
          estimation: 0,
          reportedTime: 0,
          space: removeTx.space
        },
        res,
        control,
        parents,
        []
      )
      return res
    }
  }
  return []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    IssueHTMLPresenter: issueHTMLPresenter,
    IssueTextPresenter: issueTextPresenter
  },
  trigger: {
    OnIssueUpdate,
    OnProjectRemove
  }
})

async function doTimeReportUpdate (cud: TxCUD<TimeSpendReport>, tx: Tx, control: TriggerControl): Promise<Tx[]> {
  const parentTx = tx as TxCollectionCUD<Issue, TimeSpendReport>
  switch (cud._class) {
    case core.class.TxCreateDoc: {
      const ccud = cud as TxCreateDoc<TimeSpendReport>
      const res = [
        control.txFactory.createTxUpdateDoc<Issue>(parentTx.objectClass, parentTx.objectSpace, parentTx.objectId, {
          $inc: { reportedTime: ccud.attributes.value }
        })
      ]
      const [currentIssue] = await control.findAll(tracker.class.Issue, { _id: parentTx.objectId }, { limit: 1 })
      currentIssue.reportedTime += ccud.attributes.value
      updateIssueParentEstimations(currentIssue, res, control, currentIssue.parents, currentIssue.parents)
      return res
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

        const res: Tx[] = []
        const [currentIssue] = await control.findAll(tracker.class.Issue, { _id: parentTx.objectId }, { limit: 1 })
        if (doc !== undefined) {
          res.push(
            control.txFactory.createTxUpdateDoc<Issue>(parentTx.objectClass, parentTx.objectSpace, parentTx.objectId, {
              $inc: { reportedTime: upd.operations.value - doc.value }
            })
          )
          currentIssue.reportedTime -= doc.value
          currentIssue.reportedTime += upd.operations.value
        }

        updateIssueParentEstimations(currentIssue, res, control, currentIssue.parents, currentIssue.parents)
        return res
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
        const res = [
          control.txFactory.createTxUpdateDoc<Issue>(parentTx.objectClass, parentTx.objectSpace, parentTx.objectId, {
            $inc: { reportedTime: -1 * doc.value }
          })
        ]
        const [currentIssue] = await control.findAll(tracker.class.Issue, { _id: parentTx.objectId }, { limit: 1 })
        currentIssue.reportedTime -= doc.value
        updateIssueParentEstimations(currentIssue, res, control, currentIssue.parents, currentIssue.parents)
        return res
      }
    }
  }
  return []
}

async function doIssueUpdate (
  updateTx: TxUpdateDoc<Issue>,
  control: TriggerControl,
  tx: TxCollectionCUD<Issue, AttachedDoc>
): Promise<Tx[]> {
  const res: Tx[] = []

  let currentIssue: WithLookup<Issue> | undefined

  async function getCurrentIssue (): Promise<WithLookup<Issue>> {
    if (currentIssue !== undefined) {
      return currentIssue
    }
    // We need to remove estimation information from out parent issue
    ;[currentIssue] = await control.findAll(tracker.class.Issue, { _id: updateTx.objectId }, { limit: 1 })
    return currentIssue
  }

  if (updateTx.operations.assignee != null) {
    await addTrackerAssigneeNotification(control, res, await getCurrentIssue(), updateTx.operations.assignee, tx)
  }

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

    // Remove from parent estimation list.
    const issue = await getCurrentIssue()
    updateIssueParentEstimations(issue, res, control, issue.parents, updatedParents)
  }

  if (Object.prototype.hasOwnProperty.call(updateTx.operations, 'project')) {
    res.push(
      ...(await updateSubIssues(updateTx, control, {
        project: updateTx.operations.project
      }))
    )
  }
  if (
    Object.prototype.hasOwnProperty.call(updateTx.operations, 'estimation') ||
    Object.prototype.hasOwnProperty.call(updateTx.operations, 'reportedTime')
  ) {
    const issue = await getCurrentIssue()

    issue.estimation = updateTx.operations.estimation ?? issue.estimation
    issue.reportedTime = updateTx.operations.reportedTime ?? issue.reportedTime

    updateIssueParentEstimations(issue, res, control, issue.parents, issue.parents)
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
function updateIssueParentEstimations (
  issue: {
    _id: Ref<Issue>
    space: Ref<Space>
    estimation: number
    reportedTime: number
  },
  res: Tx[],
  control: TriggerControl,
  sourceParents: IssueParentInfo[],
  targetParents: IssueParentInfo[]
): void {
  for (const pinfo of sourceParents) {
    res.push(
      control.txFactory.createTxUpdateDoc(tracker.class.Issue, issue.space, pinfo.parentId, {
        $pull: {
          childInfo: { childId: issue._id }
        }
      })
    )
  }
  for (const pinfo of targetParents) {
    res.push(
      control.txFactory.createTxUpdateDoc(tracker.class.Issue, issue.space, pinfo.parentId, {
        $push: {
          childInfo: {
            childId: issue._id,
            estimation: issue.estimation,
            reportedTime: issue.reportedTime
          }
        }
      })
    )
  }
}
