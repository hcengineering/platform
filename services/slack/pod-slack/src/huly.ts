//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import './ws-polyfill'
import { connect, connectStorage, type PlatformClient, type StorageClient } from '@hcengineering/api-client'
import core, { SortingOrder, generateId, type Blob as HulyBlob, type Ref } from '@hcengineering/core'
import task, { makeRank } from '@hcengineering/task'
import tracker, { IssuePriority, type Issue, type Project } from '@hcengineering/tracker'
import contact, { formatName, type Person } from '@hcengineering/contact'
import attachment from '@hcengineering/attachment'
import imageSize from 'image-size'
import config from './config'

let client: PlatformClient | undefined
let storage: StorageClient | undefined

export async function connectHuly (): Promise<void> {
  if (config.HulyEmail === '' || config.HulyWorkspace === '') {
    console.warn('[huly] HULY_EMAIL / HULY_WORKSPACE not set — task creation disabled')
    return
  }
  console.log(`[huly] connecting to ${config.HulyUrl} (workspace: ${config.HulyWorkspace})`)
  const auth = {
    email: config.HulyEmail,
    password: config.HulyPassword,
    workspace: config.HulyWorkspace
  }
  client = await connect(config.HulyUrl, auth)
  try {
    storage = await connectStorage(config.HulyUrl, auth)
  } catch (err) {
    console.warn('[huly] storage connect failed — attachments disabled:', String(err))
  }
  console.log('[huly] connected')
}

export function isConnected (): boolean {
  return client !== undefined
}

async function getDefaultProject (): Promise<Project> {
  if (client === undefined) throw Error('Huly not connected')
  const project = await client.findOne(tracker.class.Project, {})
  if (project === undefined) throw Error('No Tracker project found in workspace')
  return project
}

export interface CreatedTask {
  identifier: string
  title: string
  issueId: Ref<Issue>
  projectId: Ref<Project>
}

/** Create an unassigned Tracker issue. Returns its identifier, e.g. "TSK-5". */
export async function createTask (title: string): Promise<CreatedTask> {
  if (client === undefined) throw Error('Huly not connected')
  const project = await getDefaultProject()

  const issueId = generateId<Issue>()
  const lastOne = await client.findOne(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })

  const incResult = await client.updateDoc(
    tracker.class.Project,
    core.space.Space,
    project._id,
    { $inc: { sequence: 1 } },
    true
  )
  const number = (incResult as any).object.sequence
  const identifier = `${project.identifier}-${number}`

  const kind = await client.findOne(task.class.TaskType, { parent: project.type })
  if (kind === undefined) throw Error('No TaskType found for project')

  const status = project.defaultIssueStatus ?? tracker.status.Backlog
  const rank = makeRank(lastOne?.rank, undefined)

  await client.addCollection(
    tracker.class.Issue,
    project._id,
    tracker.ids.NoParent,
    tracker.class.Issue,
    'subIssues',
    {
      title,
      description: null,
      assignee: null,
      component: null,
      milestone: null,
      number,
      status,
      priority: IssuePriority.NoPriority,
      rank,
      comments: 0,
      subIssues: 0,
      dueDate: null,
      parents: [],
      remainingTime: 0,
      estimation: 0,
      reportedTime: 0,
      reports: 0,
      childInfo: [],
      identifier,
      kind: kind._id
    } as any,
    issueId
  )

  console.log(`[huly] created task ${identifier}: ${title}`)
  return { identifier, title, issueId, projectId: project._id }
}

/** Upload a file buffer to Huly and attach it to an issue. */
export async function attachFile (
  task: CreatedTask,
  buffer: Buffer,
  name: string,
  contentType: string,
  size: number
): Promise<void> {
  if (client === undefined) throw Error('Huly not connected')
  if (storage === undefined) throw Error('Huly storage not connected')

  const objectName = generateId()
  const blob = await storage.put(objectName, buffer, contentType, size)

  // Images need pixel dimensions in metadata for Huly to render the preview.
  let metadata: Record<string, any> | undefined
  if (contentType.startsWith('image/')) {
    try {
      const dim = imageSize(buffer)
      if (dim.width !== undefined && dim.height !== undefined) {
        metadata = { originalWidth: dim.width, originalHeight: dim.height, pixelRatio: 1 }
      }
    } catch (e) {
      console.warn('[huly] could not read image size:', String(e))
    }
  }

  await client.addCollection(
    attachment.class.Attachment,
    task.projectId,
    task.issueId,
    tracker.class.Issue,
    'attachments',
    {
      name,
      file: blob._id as Ref<HulyBlob>,
      type: contentType,
      size,
      lastModified: Date.now(),
      metadata
    } as any
  )
  console.log(`[huly] attached ${name} to ${task.identifier}`)
}

async function personName (ref: Ref<Person> | null | undefined): Promise<string> {
  if (client === undefined || ref == null) return 'someone'
  const person = await client.findOne(contact.class.Person, { _id: ref })
  return person !== undefined ? formatName(person.name) : 'someone'
}

const statusNameCache = new Map<string, string>()
async function statusName (ref: any): Promise<string> {
  if (client === undefined || ref == null) return 'unknown'
  const key = String(ref)
  const cached = statusNameCache.get(key)
  if (cached !== undefined) return cached
  const st = await client.findOne(tracker.class.IssueStatus, { _id: ref })
  const name = st?.name ?? 'unknown'
  statusNameCache.set(key, name)
  return name
}

interface IssueSnapshot {
  assignee: string | null
  status: string | null
}

/**
 * Poll the Tracker and report task updates (assignment + status changes) via
 * `notify`. The first poll seeds state silently so existing tasks don't spam.
 * Returns a stop function.
 */
export function startTaskWatcher (
  notify: (text: string) => Promise<void>,
  intervalMs = 10000
): () => void {
  if (client === undefined) {
    console.warn('[huly] watcher not started — not connected')
    return () => {}
  }

  const known = new Map<string, IssueSnapshot>()
  let primed = false

  const tick = async (): Promise<void> => {
    if (client === undefined) return
    const issues = await client.findAll(tracker.class.Issue, {})
    for (const issue of issues) {
      const id = issue._id as string
      const cur: IssueSnapshot = {
        assignee: (issue.assignee as any) ?? null,
        status: (issue.status as any) ?? null
      }
      const prev = known.get(id)

      if (primed && prev !== undefined) {
        // Assignment changed (and is now set).
        if (prev.assignee !== cur.assignee && cur.assignee !== null) {
          const who = await personName(issue.assignee)
          await notify(`:bust_in_silhouette: *${issue.identifier}* — _${issue.title}_ assigned to *${who}*`)
        }
        // Status changed.
        if (prev.status !== cur.status && cur.status !== null) {
          const name = await statusName(cur.status)
          await notify(`:arrows_counterclockwise: *${issue.identifier}* — _${issue.title}_ moved to *${name}*`)
        }
      }
      known.set(id, cur)
    }
    primed = true
  }

  void tick().catch((e) => console.warn('[huly] watcher prime error:', String(e)))
  const handle = setInterval(() => {
    void tick().catch((e) => console.warn('[huly] watcher tick error:', String(e)))
  }, intervalMs)

  console.log(`[huly] task watcher running (every ${intervalMs / 1000}s)`)
  return () => clearInterval(handle)
}

export async function closeHuly (): Promise<void> {
  await client?.close()
  client = undefined
}
