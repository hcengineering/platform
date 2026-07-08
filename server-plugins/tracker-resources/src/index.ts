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

import chunter, { ChatMessage } from '@hcengineering/chunter'
import contact, { Employee, Person, PersonSpace } from '@hcengineering/contact'
import core, {
  AccountUuid,
  concatLink,
  Data,
  Doc,
  DocumentUpdate,
  generateId,
  Ref,
  Space,
  Tx,
  TxCreateDoc,
  TxCUD,
  TxProcessor,
  TxRemoveDoc,
  TxUpdateDoc,
  WithLookup
} from '@hcengineering/core'
import notification, { DocNotifyContext, NotificationContent } from '@hcengineering/notification'
import { getMetadata, IntlString } from '@hcengineering/platform'
import serverCore, { TriggerControl } from '@hcengineering/server-core'
import { getAccountBySocialId } from '@hcengineering/server-contact'
import { NOTIFICATION_BODY_SIZE } from '@hcengineering/server-notification'
import { stripTags } from '@hcengineering/text-core'
import tracker, {
  Component,
  type DependencyShiftedNotification,
  type DependencyShiftRequest,
  groupShiftsByRecipient,
  Issue,
  IssueParentInfo,
  TimeSpendReport,
  trackerId,
  type Project
} from '@hcengineering/tracker'
import { workbenchId } from '@hcengineering/workbench'

async function updateSubIssues (
  updateTx: TxUpdateDoc<Issue>,
  control: TriggerControl,
  update: DocumentUpdate<Issue> | ((node: Issue) => DocumentUpdate<Issue>)
): Promise<TxUpdateDoc<Issue>[]> {
  const subIssues = await control.findAll(control.ctx, tracker.class.Issue, { 'parents.parentId': updateTx.objectId })

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
  const front = control.branding?.front ?? getMetadata(serverCore.metadata.FrontUrl) ?? ''
  const path = `${workbenchId}/${control.workspace.url}/${trackerId}/${issue.identifier}`
  const link = concatLink(front, path)
  return `<a href="${link}">${issue.identifier}</a> ${issue.title}`
}

/**
 * @public
 */
export async function getIssueId (doc: Issue, control: TriggerControl): Promise<string> {
  const issue = doc
  const project = (await control.findAll(control.ctx, tracker.class.Project, { _id: issue.space }))[0]
  return `${project?.identifier ?? '?'}-${issue.number}`
}

/**
 * @public
 */
export async function issueTextPresenter (doc: Doc): Promise<string> {
  const issue = doc as Issue
  return `${issue.identifier} ${issue.title}`
}

/**
 * @public
 */
export async function getIssueNotificationContent (
  doc: Doc,
  tx: TxCUD<Doc>,
  target: Ref<Person>,
  control: TriggerControl
): Promise<NotificationContent> {
  const issue = doc as Issue

  const issueTitle = await issueTextPresenter(doc)

  const title = tracker.string.IssueNotificationTitle
  let body = tracker.string.IssueNotificationBody
  const intlParams: Record<string, string | number> = {
    issueTitle
  }
  const intlParamsNotLocalized: Record<string, IntlString> = {}

  if (tx._class === core.class.TxCreateDoc) {
    if (tx.objectClass === chunter.class.ChatMessage) {
      const createTx = tx as TxCreateDoc<ChatMessage>
      const message = createTx.attributes.message
      const plainTextMessage = stripTags(message, NOTIFICATION_BODY_SIZE)
      intlParams.message = plainTextMessage
    }
  } else if (tx._class === core.class.TxUpdateDoc) {
    const updateTx = tx as TxUpdateDoc<Issue>

    if (
      updateTx.operations.assignee !== null &&
      updateTx.operations.assignee !== undefined &&
      updateTx.operations.assignee === target
    ) {
      body = tracker.string.IssueAssignedToYou
    } else {
      const attributes = control.hierarchy.getAllAttributes(doc._class)
      for (const attrName in updateTx.operations) {
        if (!Object.prototype.hasOwnProperty.call(updateTx.operations, attrName)) {
          continue
        }

        const attr = attributes.get(attrName)
        if (attr !== null && attr !== undefined) {
          intlParamsNotLocalized.property = attr.label
          if (attr.type._class === core.class.TypeString) {
            body = tracker.string.IssueNotificationChangedProperty
            intlParams.newValue = (issue as any)[attr.name]?.toString()
          } else {
            body = tracker.string.IssueNotificationChanged
          }
        }
        break
      }
    }
  }

  return {
    title,
    body,
    intlParams,
    intlParamsNotLocalized
  }
}

/**
 * @public
 */
export async function OnProjectRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = tx as TxRemoveDoc<Project>
    const classes = [tracker.class.Issue, tracker.class.Component, tracker.class.Milestone, tracker.class.IssueTemplate]
    for (const cls of classes) {
      const docs = await control.findAll(control.ctx, cls, { space: ctx.objectId })
      for (const doc of docs) {
        const tx = control.txFactory.createTxRemoveDoc(cls, doc.space, doc._id)
        result.push(tx)
      }
    }
  }
  control.ctx.contextData.broadcast.targets.projectRemove = async (it) => {
    return {
      target: []
    }
  }
  return result
}

/**
 * @public
 */
export async function OnComponentRemove (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    const ctx = tx as TxRemoveDoc<Component>

    const issues = await control.findAll(control.ctx, tracker.class.Issue, {
      component: ctx.objectId
    })
    if (issues === undefined) {
      continue
    }
    for (const issue of issues) {
      const issuePush = {
        ...issue,
        component: null
      }
      const tx = control.txFactory.createTxUpdateDoc(issue._class, issue.space, issue._id, issuePush)
      result.push(tx)
    }
  }
  return result
}

/**
 * @public
 */
export async function OnIssueUpdate (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const actualTx of txes) {
    // Check TimeReport operations
    if (
      actualTx._class === core.class.TxCreateDoc ||
      actualTx._class === core.class.TxUpdateDoc ||
      actualTx._class === core.class.TxRemoveDoc
    ) {
      const cud = actualTx as TxCUD<TimeSpendReport>
      if (cud.objectClass === tracker.class.TimeSpendReport) {
        result.push(...(await doTimeReportUpdate(cud, control)))
      }
    }

    if (actualTx._class === core.class.TxCreateDoc) {
      const createTx = actualTx as TxCreateDoc<Issue>
      if (control.hierarchy.isDerived(createTx.objectClass, tracker.class.Issue)) {
        const issue = TxProcessor.createDoc2Doc(createTx)
        updateIssueParentEstimations(issue, result, control, [], issue.parents)
        continue
      }
    }

    if (actualTx._class === core.class.TxUpdateDoc) {
      const updateTx = actualTx as TxUpdateDoc<Issue>
      if (control.hierarchy.isDerived(updateTx.objectClass, tracker.class.Issue)) {
        result.push(...(await doIssueUpdate(updateTx, control)))
        continue
      }
    }
    if (actualTx._class === core.class.TxRemoveDoc) {
      const removeTx = actualTx as TxRemoveDoc<Issue>
      if (control.hierarchy.isDerived(removeTx.objectClass, tracker.class.Issue)) {
        const parentIssue = await control.findAll(control.ctx, tracker.class.Issue, {
          'childInfo.childId': removeTx.objectId
        })
        const parents: IssueParentInfo[] = parentIssue.map((it) => ({
          parentId: it._id,
          parentTitle: it.title,
          identifier: it.identifier,
          space: it.space
        }))
        updateIssueParentEstimations(
          {
            _id: removeTx.objectId,
            estimation: 0,
            reportedTime: 0,
            space: removeTx.space
          },
          result,
          control,
          parents,
          []
        )
      }
    }
  }
  return result
}

async function doTimeReportUpdate (cud: TxCUD<TimeSpendReport>, control: TriggerControl): Promise<Tx[]> {
  const { attachedTo: attachedToId, attachedToClass } = cud
  if (attachedToClass === undefined || attachedToId === undefined) {
    return []
  }
  const attachedTo = attachedToId as Ref<Issue>
  switch (cud._class) {
    case core.class.TxCreateDoc: {
      const ccud = cud as TxCreateDoc<TimeSpendReport>
      const [currentIssue] = await control.findAll(control.ctx, tracker.class.Issue, { _id: attachedTo }, { limit: 1 })
      const res = [
        control.txFactory.createTxUpdateDoc<Issue>(
          attachedToClass,
          cud.objectSpace,
          attachedTo,
          {
            $inc: { reportedTime: ccud.attributes.value }
          },
          false,
          currentIssue.modifiedOn
        )
      ]
      currentIssue.reportedTime += ccud.attributes.value
      currentIssue.remainingTime = Math.max(0, currentIssue.estimation - currentIssue.reportedTime)
      updateIssueParentEstimations(currentIssue, res, control, currentIssue.parents, currentIssue.parents)
      return res
    }
    case core.class.TxUpdateDoc: {
      const upd = cud as TxUpdateDoc<TimeSpendReport>
      if (upd.operations.value !== undefined) {
        const logTxes = Array.from(
          await control.findAll(control.ctx, core.class.TxCUD, {
            objectId: cud.objectId
          })
        ).filter((it) => it._id !== cud._id)
        const doc = TxProcessor.buildDoc2Doc<TimeSpendReport>(logTxes)

        const res: Tx[] = []
        const [currentIssue] = await control.findAll(
          control.ctx,
          tracker.class.Issue,
          { _id: attachedTo },
          { limit: 1 }
        )
        if (doc != null) {
          res.push(
            control.txFactory.createTxUpdateDoc<Issue>(
              attachedToClass,
              cud.objectSpace,
              attachedTo,
              {
                $inc: { reportedTime: upd.operations.value - doc.value }
              },
              false,
              currentIssue.modifiedOn
            )
          )
          currentIssue.reportedTime -= doc.value
          currentIssue.reportedTime += upd.operations.value
          currentIssue.remainingTime = Math.max(0, currentIssue.estimation - currentIssue.reportedTime)
        }

        updateIssueParentEstimations(currentIssue, res, control, currentIssue.parents, currentIssue.parents)
        return res
      }
      break
    }
    case core.class.TxRemoveDoc: {
      if (!control.removedMap.has(attachedTo)) {
        const logTxes = Array.from(
          await control.findAll(control.ctx, core.class.TxCUD, {
            objectId: cud.objectId
          })
        ).filter((it) => it._id !== cud._id)
        const doc = TxProcessor.buildDoc2Doc<TimeSpendReport>(logTxes)
        if (doc != null) {
          const [currentIssue] = await control.findAll(
            control.ctx,
            tracker.class.Issue,
            { _id: attachedTo },
            { limit: 1 }
          )
          const res = [
            control.txFactory.createTxUpdateDoc<Issue>(
              attachedToClass,
              cud.objectSpace,
              attachedTo,
              {
                $inc: { reportedTime: -1 * doc.value }
              },
              false,
              currentIssue.modifiedOn
            )
          ]
          currentIssue.reportedTime -= doc.value
          currentIssue.remainingTime = Math.max(0, currentIssue.estimation - currentIssue.reportedTime)
          updateIssueParentEstimations(currentIssue, res, control, currentIssue.parents, currentIssue.parents)
          return res
        }
      }
    }
  }
  return []
}

async function doIssueUpdate (updateTx: TxUpdateDoc<Issue>, control: TriggerControl): Promise<Tx[]> {
  const res: Tx[] = []

  let currentIssue: WithLookup<Issue> | undefined

  async function getCurrentIssue (): Promise<WithLookup<Issue>> {
    if (currentIssue !== undefined) {
      return currentIssue
    }
    // We need to remove estimation information from out parent issue
    ;[currentIssue] = await control.findAll(control.ctx, tracker.class.Issue, { _id: updateTx.objectId }, { limit: 1 })
    return currentIssue
  }

  if (Object.prototype.hasOwnProperty.call(updateTx.operations, 'attachedTo')) {
    const [newParent] = await control.findAll(
      control.ctx,
      tracker.class.Issue,
      { _id: updateTx.operations.attachedTo as Ref<Issue> },
      { limit: 1 }
    )

    const updatedParents: IssueParentInfo[] =
      newParent !== undefined
        ? [
            {
              parentId: newParent._id,
              parentTitle: newParent.title,
              space: newParent.space,
              identifier: newParent.identifier
            },
            ...newParent.parents
          ]
        : []

    function update (issue: Issue): DocumentUpdate<Issue> {
      const parentInfoIndex = issue.parents.findIndex(({ parentId }) => parentId === updateTx.objectId)
      const parentsUpdate =
        parentInfoIndex === -1
          ? {}
          : { parents: [...issue.parents].slice(0, parentInfoIndex + 1).concat(updatedParents) }

      return { ...parentsUpdate }
    }

    res.push(
      control.txFactory.createTxUpdateDoc(updateTx.objectClass, updateTx.objectSpace, updateTx.objectId, {
        parents: updatedParents
      }),
      ...(await updateSubIssues(updateTx, control, update))
    )

    // Remove from parent estimation list.
    const issue = await getCurrentIssue()
    updateIssueParentEstimations(issue, res, control, issue.parents, updatedParents)
  }

  if (
    Object.prototype.hasOwnProperty.call(updateTx.operations, 'estimation') ||
    Object.prototype.hasOwnProperty.call(updateTx.operations, 'reportedTime') ||
    (Object.prototype.hasOwnProperty.call(updateTx.operations, '$inc') &&
      Object.prototype.hasOwnProperty.call(updateTx.operations.$inc, 'reportedTime'))
  ) {
    const issue = await getCurrentIssue()

    issue.estimation = updateTx.operations.estimation ?? issue.estimation
    issue.reportedTime = updateTx.operations.reportedTime ?? issue.reportedTime
    issue.remainingTime = Math.max(0, issue.estimation - issue.reportedTime)

    res.push(
      control.txFactory.createTxUpdateDoc(tracker.class.Issue, issue.space, issue._id, {
        remainingTime: issue.remainingTime
      })
    )

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
      control.txFactory.createTxUpdateDoc(tracker.class.Issue, pinfo.space, pinfo.parentId, {
        $pull: {
          childInfo: { childId: issue._id }
        }
      })
    )
  }
  for (const pinfo of targetParents) {
    res.push(
      control.txFactory.createTxUpdateDoc(tracker.class.Issue, pinfo.space, pinfo.parentId, {
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

async function issueLinkIdProvider (issue: Issue): Promise<string> {
  return issue.identifier
}

/**
 *  — Notification on Dependency-Shift (server-side dispatch).
 *
 * Resolve the per-issue collaborator list server-side. Reads
 * `core.class.Collaborator` attached to each shifted issue and falls back to
 * the issue's `assignee` (resolved to an `AccountUuid` via the Employee mixin)
 * for issues nobody has opened yet — matching the retired client-side helper.
 */
async function collectShiftCollaborators (
  control: TriggerControl,
  issueIds: Array<Ref<Issue>>
): Promise<Map<Ref<Issue>, AccountUuid[]>> {
  const map = new Map<Ref<Issue>, AccountUuid[]>()
  if (issueIds.length === 0) return map

  const uniqueIds = Array.from(new Set(issueIds))
  const collabs = await control.findAll(control.ctx, core.class.Collaborator, {
    attachedTo: { $in: uniqueIds as Array<Ref<Doc>> }
  })
  for (const c of collabs) {
    const target = c.attachedTo as Ref<Issue>
    const bucket = map.get(target)
    if (bucket === undefined) {
      map.set(target, [c.collaborator])
    } else if (!bucket.includes(c.collaborator)) {
      bucket.push(c.collaborator)
    }
  }

  // Assignee fallback for issues without Collaborator docs. The shift payload
  // carries no assignee, so re-read the issues server-side (fresh, ACL-safe).
  const missingIds = uniqueIds.filter((id) => !map.has(id))
  if (missingIds.length > 0) {
    const issues = await control.findAll(
      control.ctx,
      tracker.class.Issue,
      { _id: { $in: missingIds } },
      { projection: { _id: 1, assignee: 1 } }
    )
    const withAssignee = issues.filter((i) => i.assignee != null)
    if (withAssignee.length > 0) {
      const employees = await control.findAll(
        control.ctx,
        contact.mixin.Employee,
        { _id: { $in: withAssignee.map((i) => i.assignee as Ref<Employee>) } },
        { projection: { _id: 1, personUuid: 1 } }
      )
      const byEmpId = new Map(employees.map((e) => [e._id, e.personUuid]))
      for (const i of withAssignee) {
        const acc = byEmpId.get(i.assignee as Ref<Employee>)
        if (acc != null) map.set(i._id, [acc])
      }
    }
  }

  return map
}

/**
 *  — Notification on Dependency-Shift (server-side dispatch).
 *
 * Resolve recipient `AccountUuid` → `PersonSpace` server-side. The
 * notification/context `space` MUST be the recipient's own `PersonSpace` (the
 * inbox routing key), so this runs privileged in the trigger rather than being
 * a client cross-space write. Deactivated recipients drop out silently.
 */
async function resolveShiftRecipientSpaces (
  control: TriggerControl,
  recipients: AccountUuid[]
): Promise<Map<AccountUuid, Ref<PersonSpace>>> {
  const map = new Map<AccountUuid, Ref<PersonSpace>>()
  if (recipients.length === 0) return map

  const employees = await control.findAll(
    control.ctx,
    contact.mixin.Employee,
    { personUuid: { $in: recipients }, active: true },
    { projection: { _id: 1, personUuid: 1 } }
  )
  if (employees.length === 0) return map

  const spaces = await control.findAll(
    control.ctx,
    contact.class.PersonSpace,
    { person: { $in: employees.map((e) => e._id) } },
    { projection: { _id: 1, person: 1 } }
  )
  const spaceByPerson = new Map(spaces.map((s) => [s.person, s._id]))
  for (const e of employees) {
    if (e.personUuid == null) continue
    const space = spaceByPerson.get(e._id)
    if (space != null) map.set(e.personUuid, space)
  }
  return map
}

/**
 *  — Notification on Dependency-Shift (server-side dispatch).
 *
 * Server-side replacement for the retired client-side notification writes.
 * Reacts to a `DependencyShiftRequest` create, fans out one
 * `DependencyShiftedNotification` per recipient into that recipient's own
 * `PersonSpace`, then removes the request doc.
 *
 * Anti-spoofing: `triggerUserId` is derived from `tx.modifiedBy`
 * (`getAccountBySocialId`) — never from client-supplied payload. If the
 * originating account cannot be resolved the dispatch is skipped (fail-closed);
 * the request is still removed so no residue accumulates.
 * @public
 */
export async function OnDependencyShiftRequest (txes: Tx[], control: TriggerControl): Promise<Tx[]> {
  const result: Tx[] = []
  for (const tx of txes) {
    if (tx._class !== core.class.TxCreateDoc) continue
    const createTx = tx as TxCreateDoc<DependencyShiftRequest>
    if (createTx.objectClass !== tracker.class.DependencyShiftRequest) continue

    const req = TxProcessor.createDoc2Doc(createTx)

    // Always clean up the request doc, whatever happens below.
    result.push(control.txFactory.createTxRemoveDoc(createTx.objectClass, createTx.objectSpace, createTx.objectId))

    // Anti-spoofing: resolve the trigger user from the tx author, not payload.
    const triggerUserId = await getAccountBySocialId(control, createTx.modifiedBy)
    if (triggerUserId == null) continue // fail-closed: no trusted author → no dispatch

    const shiftedIssues = req.shiftedIssues ?? []
    if (shiftedIssues.length === 0) continue

    const collaborators = await collectShiftCollaborators(
      control,
      shiftedIssues.map((s) => s.issueId)
    )
    const bundles = groupShiftsByRecipient(triggerUserId, shiftedIssues, collaborators)
    if (bundles.size === 0) continue

    const spaces = await resolveShiftRecipientSpaces(control, Array.from(bundles.keys()))
    if (spaces.size === 0) continue

    for (const [recipient, recipientShifts] of bundles) {
      const space = spaces.get(recipient)
      if (space === undefined) continue

      const existing = await control.findAll(
        control.ctx,
        notification.class.DocNotifyContext,
        { objectId: req.triggerIssueId, user: recipient },
        { limit: 1 }
      )

      let contextId: Ref<DocNotifyContext>
      if (existing.length > 0) {
        contextId = existing[0]._id
        result.push(
          control.txFactory.createTxUpdateDoc(existing[0]._class, existing[0].space, existing[0]._id, {
            hidden: false,
            lastUpdateTimestamp: Date.now()
          })
        )
      } else {
        contextId = generateId<DocNotifyContext>()
        const contextData: Data<DocNotifyContext> = {
          user: recipient,
          objectId: req.triggerIssueId,
          objectClass: tracker.class.Issue,
          objectSpace: req.triggerIssueSpace,
          hidden: false,
          isPinned: false,
          lastUpdateTimestamp: Date.now()
        }
        result.push(
          control.txFactory.createTxCreateDoc(
            notification.class.DocNotifyContext,
            space as unknown as Ref<Space>,
            contextData,
            contextId
          )
        )
      }

      const notifData: Data<DependencyShiftedNotification> = {
        user: recipient,
        isViewed: false,
        docNotifyContext: contextId,
        objectId: req.triggerIssueId,
        objectClass: tracker.class.Issue,
        archived: false,
        header: tracker.string.DependencyShiftedHeader,
        message: tracker.string.DependencyShiftedMessage,
        intlParams: {
          count: recipientShifts.length,
          trigger: req.triggerIssueIdentifier
        },
        triggerIssueId: req.triggerIssueId,
        triggerIssueIdentifier: req.triggerIssueIdentifier,
        triggerIssueTitle: req.triggerIssueTitle,
        triggerUserId,
        shiftedIssues: recipientShifts,
        cascadeToken: req.cascadeToken
      }
      result.push(
        control.txFactory.createTxCreateDoc(
          tracker.class.DependencyShiftedNotification,
          space as unknown as Ref<Space>,
          notifData
        )
      )
    }
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async () => ({
  function: {
    IssueHTMLPresenter: issueHTMLPresenter,
    IssueTextPresenter: issueTextPresenter,
    IssueNotificationContentProvider: getIssueNotificationContent,
    IssueLinkIdProvider: issueLinkIdProvider
  },
  trigger: {
    OnIssueUpdate,
    OnComponentRemove,
    OnProjectRemove,
    OnDependencyShiftRequest
  }
})
