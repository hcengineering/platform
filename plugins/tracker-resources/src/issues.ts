import { Doc, DocumentUpdate, Ref, RelatedDocument, TxOperations } from '@hcengineering/core'
import presentation, { getClient } from '@hcengineering/presentation'
import { getMetadata } from '@hcengineering/platform'
import { Component, Issue, Project, Milestone, trackerId } from '@hcengineering/tracker'
import { Location, ResolvedLocation, getPanelURI, getCurrentResolvedLocation } from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'
import { writable } from 'svelte/store'
import tracker from './plugin'

export const activeComponent = writable<Ref<Component> | undefined>(undefined)
export const activeMilestone = writable<Ref<Milestone> | undefined>(undefined)

export function getIssueId (project: Project, issue: Issue): string {
  return `${project.identifier}-${issue.number}`
}

export function isIssueId (shortLink: string): boolean {
  return /^\S+-\d+$/.test(shortLink)
}

export async function getIssueTitle (client: TxOperations, ref: Ref<Doc>): Promise<string> {
  const object = await client.findOne(
    tracker.class.Issue,
    { _id: ref as Ref<Issue> },
    { lookup: { space: tracker.class.Project } }
  )
  if (object?.$lookup?.space === undefined) throw new Error(`Issue project not found, _id: ${ref}`)
  return getIssueId(object.$lookup.space, object)
}

async function getTitle (doc: Doc): Promise<string> {
  const client = getClient()
  const issue = doc as Issue
  const object = await client.findOne(tracker.class.Project, { _id: issue.space })
  if (object === undefined) return `?-${issue.number}`
  return getIssueId(object, issue)
}

export function generateIssuePanelUri (issue: Issue): string {
  return getPanelURI(tracker.component.EditIssue, issue._id, issue._class, 'content')
}

export async function issueIdProvider (doc: Doc): Promise<string> {
  return await getTitle(doc)
}

export async function issueLinkFragmentProvider (doc: Doc): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = trackerId
  loc.path[3] = await getTitle(doc)

  return loc
}

export async function issueTitleProvider (doc: Issue): Promise<string> {
  return await Promise.resolve(doc.title)
}

export async function issueLinkProvider (doc: Doc): Promise<string> {
  return await getTitle(doc).then(generateIssueShortLink)
}

export function generateIssueShortLink (issueId: string): string {
  const location = getCurrentResolvedLocation()
  const frontUrl = getMetadata(presentation.metadata.FrontUrl)
  const protocolAndHost = frontUrl ?? `${window.location.protocol}//${window.location.host}`
  return `${protocolAndHost}/${workbenchId}/${location.path[1]}/${trackerId}/${issueId}`
}

export async function generateIssueLocation (loc: Location, issueId: string): Promise<ResolvedLocation | undefined> {
  const tokens = issueId.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const projectId = tokens[0]
  const issueNumber = Number(tokens[1])
  const client = getClient()
  const project = await client.findOne(tracker.class.Project, { identifier: projectId })
  if (project === undefined) {
    console.error(
      `Could not find project ${projectId}. Make sure you are in correct workspace and the project was not deleted or renamed.`
    )
    return undefined
  }
  const issue = await client.findOne(tracker.class.Issue, { number: issueNumber, space: project._id })
  if (issue === undefined) {
    console.error(`Could not find issue ${issueId}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  return {
    loc: {
      path: [appComponent, workspace],
      fragment: generateIssuePanelUri(issue)
    },
    defaultLocation: {
      path: [appComponent, workspace, trackerId, project._id, 'issues'],
      fragment: generateIssuePanelUri(issue)
    }
  }
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  const app = loc.path[2]
  if (app !== trackerId) {
    return undefined
  }

  const shortLink = loc.path[3]

  // issue shortlink
  if (isIssueId(shortLink)) {
    return await generateIssueLocation(loc, shortLink)
  }

  return undefined
}

export async function updateIssueRelation (
  client: TxOperations,
  value: Issue,
  id: RelatedDocument,
  prop: 'blockedBy' | 'relations',
  operation: '$push' | '$pull'
): Promise<void> {
  let update: DocumentUpdate<Issue> = {}
  switch (operation) {
    case '$push':
      update = { $push: { [prop]: { _id: id._id, _class: id._class } } }
      break
    case '$pull':
      update = { $pull: { [prop]: { _id: id._id } } }
      break
  }
  await client.update(value, update)
}
