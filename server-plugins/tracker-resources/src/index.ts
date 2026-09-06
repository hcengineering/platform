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
  type ShiftedIssuePayload,
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
 * Notification on Dependency-Shift (server-side dispatch).
 *
 * Upper bound on how many shift entries a single request may fan out. The
 * request payload is client-supplied, so an unbounded list would let one write
 * turn into an arbitrary number of privileged cross-space notification writes.
 * Entries beyond the cap are dropped.
 */
const MAX_SHIFTED_ISSUES = 200

/** Upper bound for the correlation token copied onto the notification. */
const MAX_CASCADE_TOKEN_LENGTH = 128

/**
 * Notification on Dependency-Shift (server-side dispatch).
 *
 * The subset of `Issue` the dispatch reads back from storage. Everything the
 * notification shows about a shifted issue comes from here, never from the
 * request payload. No dates are read: the notification does not report a shift
 * delta (it would rest on unverifiable client-reported pre-shift dates), only
 * which issues moved. `assignee` is kept solely for collaborator fallback.
 */
type ShiftIssueDoc = Pick<Issue, '_id' | 'space' | 'identifier' | 'title' | 'assignee'>

const shiftIssueProjection = {
  _id: 1,
  space: 1,
  identifier: 1,
  title: 1,
  assignee: 1
} as const

/**
 * Notification on Dependency-Shift (server-side dispatch).
 *
 * `cascadeToken` is a pure correlation marker: it is the `TxApplyIf.scope` of
 * the cascade commit and lets a consumer tie a notification bundle back to the
 * Tx batch that caused it. It carries no authorization meaning — nothing in
 * this trigger branches on it — so it is copied through rather than re-minted
 * (re-minting would break exactly the correlation it exists for). It is only
 * type- and length-checked so a client cannot smuggle a large blob into every
 * recipient's `PersonSpace`.
 */
function sanitizeCascadeToken (value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.slice(0, MAX_CASCADE_TOKEN_LENGTH)
}

/**
 * Notification on Dependency-Shift (server-side dispatch).
 *
 * Rebuild the shift payload from storage instead of trusting the request.
 *
 * The request doc is written by a client into a *project* space it may edit,
 * but the dispatch below writes privileged into foreign `PersonSpace`s. Taking
 * issue ids, identifiers, titles or dates from that payload would let anyone
 * with write access to any single project push made-up notifications — foreign
 * identifier, foreign title, arbitrary dates — at members of projects they
 * cannot even read. So every entry is resolved against `tracker.class.Issue`
 * restricted to the request's own space:
 *
 *  - ids that are not strings, not issues, not in this space, or unknown are
 *    dropped (a non-issue `Ref` cannot match an `Issue` query at all),
 *  - duplicate ids collapse to one entry,
 *  - the list is capped at `MAX_SHIFTED_ISSUES`,
 *  - `identifier` and `title` come from the stored doc; no dates or delta are
 *    emitted (a client-reported delta would be unverifiable, so it is not shown).
 *
 * Returns the rebuilt payloads plus the issue docs they were built from, so the
 * collaborator resolution can reuse them.
 */
async function resolveShiftPayload (
  control: TriggerControl,
  space: Ref<Space>,
  rawEntries: unknown
): Promise<{ payloads: ShiftedIssuePayload[], issues: ShiftIssueDoc[] }> {
  const empty = { payloads: [], issues: [] }
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) return empty

  // Unique, string-typed ids in payload order, capped.
  const ids: Array<Ref<Issue>> = []
  const seen = new Set<string>()
  for (const raw of rawEntries) {
    if (raw == null || typeof raw !== 'object') continue
    const entry = raw as Record<string, unknown>
    const issueId = entry.issueId
    if (typeof issueId !== 'string' || issueId.length === 0) continue
    if (seen.has(issueId)) continue
    seen.add(issueId)
    ids.push(issueId as Ref<Issue>)
    if (ids.length >= MAX_SHIFTED_ISSUES) break
  }
  if (ids.length === 0) return empty

  const found = await control.findAll(
    control.ctx,
    tracker.class.Issue,
    { _id: { $in: ids }, space: space as Ref<Project> },
    { projection: shiftIssueProjection }
  )
  if (found.length === 0) return empty

  const byId = new Map<Ref<Issue>, ShiftIssueDoc>(found.map((i) => [i._id, i]))
  const payloads: ShiftedIssuePayload[] = []
  const issues: ShiftIssueDoc[] = []
  for (const id of ids) {
    const issue = byId.get(id)
    if (issue === undefined) continue // foreign space, unknown id or not an issue

    issues.push(issue)
    payloads.push({
      issueId: issue._id,
      identifier: issue.identifier,
      title: issue.title
    })
  }

  return { payloads, issues }
}

/**
 * Notification on Dependency-Shift (server-side dispatch).
 *
 * Resolve the per-issue collaborator list server-side. Reads
 * `core.class.Collaborator` attached to each shifted issue and falls back to
 * the issue's `assignee` (resolved to an `AccountUuid` via the Employee mixin)
 * for issues nobody has opened yet — matching the retired client-side helper.
 *
 * Takes the issue docs already read back by `resolveShiftPayload`, so the
 * `attachedTo` set is guaranteed to hold real issues of the request's own
 * space — never raw ids from the request payload.
 */
async function collectShiftCollaborators (
  control: TriggerControl,
  issues: ShiftIssueDoc[]
): Promise<Map<Ref<Issue>, AccountUuid[]>> {
  const map = new Map<Ref<Issue>, AccountUuid[]>()
  if (issues.length === 0) return map

  const uniqueIds = issues.map((i) => i._id)
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

  // Assignee fallback for issues without Collaborator docs.
  const withAssignee = issues.filter((i) => !map.has(i._id) && i.assignee != null)
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

  return map
}

/**
 * Notification on Dependency-Shift (server-side dispatch).
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
 * Notification on Dependency-Shift (server-side dispatch).
 *
 * Server-side replacement for the retired client-side notification writes.
 * Reacts to a `DependencyShiftRequest` create, fans out one
 * `DependencyShiftedNotification` per recipient into that recipient's own
 * `PersonSpace`, then removes the request doc.
 *
 * Anti-spoofing. The request doc is client-written, so nothing in it is
 * trusted; everything the notification asserts is re-derived server-side:
 *
 *  - `triggerUserId` comes from `tx.modifiedBy` (`getAccountBySocialId`),
 *  - the trigger issue is loaded as a real `tracker.class.Issue` of
 *    `tx.objectSpace`, and its identifier/title/space come from that doc,
 *  - the shifted-issue list is rebuilt by `resolveShiftPayload` (same-space
 *    issues only, deduplicated, capped, dates from storage).
 *
 * Every step is fail-closed: an unresolvable author, a trigger issue that is
 * not an issue of this space, or an empty list after filtering all end the
 * dispatch. The request doc is removed in every case so no residue accumulates.
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

    // The notification subject must be a real issue of the space the request
    // was written into — not whatever id the payload names.
    if (typeof req.triggerIssueId !== 'string' || req.triggerIssueId.length === 0) continue
    const triggerIssues = await control.findAll(
      control.ctx,
      tracker.class.Issue,
      { _id: req.triggerIssueId, space: createTx.objectSpace as Ref<Project> },
      { limit: 1, projection: shiftIssueProjection }
    )
    if (triggerIssues.length === 0) continue // fail-closed: foreign/unknown trigger issue
    const triggerIssue: ShiftIssueDoc = triggerIssues[0]

    const { payloads: shiftedIssues, issues: shiftedDocs } = await resolveShiftPayload(
      control,
      createTx.objectSpace,
      req.shiftedIssues
    )
    if (shiftedIssues.length === 0) continue // fail-closed: nothing survived validation

    const cascadeToken = sanitizeCascadeToken(req.cascadeToken)

    const collaborators = await collectShiftCollaborators(control, shiftedDocs)
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
        { objectId: triggerIssue._id, user: recipient },
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
          objectId: triggerIssue._id,
          objectClass: tracker.class.Issue,
          objectSpace: triggerIssue.space,
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
          trigger: triggerIssue.identifier
        },
        triggerIssueId: triggerIssue._id,
        triggerIssueIdentifier: triggerIssue.identifier,
        triggerIssueTitle: triggerIssue.title,
        triggerUserId,
        shiftedIssues: recipientShifts,
        cascadeToken
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
