import { Doc, DocumentUpdate, Ref, RelatedDocument, TxOperations } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import { Issue, Project, Sprint, Team, trackerId } from '@hcengineering/tracker'
import { getCurrentLocation, getPanelURI, Location, navigate } from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'
import { writable } from 'svelte/store'
import tracker from './plugin'

export const activeProject = writable<Ref<Project> | undefined>(undefined)
export const activeSprint = writable<Ref<Sprint> | undefined>(undefined)

export function getIssueId (team: Team, issue: Issue): string {
  return `${team.identifier}-${issue.number}`
}

export function isIssueId (shortLink: string): boolean {
  return /^\w+-\d+$/.test(shortLink)
}

export async function getIssueTitle (client: TxOperations, ref: Ref<Doc>): Promise<string> {
  const object = await client.findOne(
    tracker.class.Issue,
    { _id: ref as Ref<Issue> },
    { lookup: { space: tracker.class.Team } }
  )
  if (object?.$lookup?.space === undefined) throw new Error(`Issue Team not found, _id: ${ref}`)
  return getIssueId(object.$lookup.space, object)
}

export function generateIssuePanelUri (issue: Issue): string {
  return getPanelURI(tracker.component.EditIssue, issue._id, issue._class, 'content')
}

export async function issueIdProvider (doc: Doc): Promise<string> {
  const client = getClient()
  return await getIssueTitle(client, doc._id)
}

export async function issueLinkFragmentProvider (doc: Doc): Promise<string> {
  const client = getClient()
  return await getIssueTitle(client, doc._id).then((p) => `${trackerId}|${p}`)
}

export async function issueTitleProvider (doc: Issue): Promise<string> {
  return await Promise.resolve(doc.title)
}

export async function issueLinkProvider (doc: Doc): Promise<string> {
  const client = getClient()
  return await getIssueTitle(client, doc._id).then(generateIssueShortLink)
}

export function generateIssueShortLink (issueId: string): string {
  const location = getCurrentLocation()
  return `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${trackerId}#${trackerId}|${issueId}`
}

export async function generateIssueLocation (loc: Location, issueId: string): Promise<Location | undefined> {
  const tokens = issueId.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const teamId = tokens[0]
  const issueNumber = Number(tokens[1])
  const client = getClient()
  const team = await client.findOne(tracker.class.Team, { identifier: teamId })
  if (team === undefined) {
    console.error(
      `Could not find team ${teamId}. Make sure you are in correct workspace and the team was not deleted or renamed.`
    )
    return undefined
  }
  const issue = await client.findOne(tracker.class.Issue, { number: issueNumber, space: team._id })
  if (issue === undefined) {
    console.error(`Could not find issue ${issueId}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''
  return {
    path: [appComponent, workspace, trackerId, team._id, 'issues'],
    fragment: generateIssuePanelUri(issue)
  }
}

function checkOld (loc: Location): void {
  const short = loc.path[3]
  if (isIssueId(short)) {
    loc.fragment = short
    loc.path.length = 3
    navigate(loc)
  }
}

export async function resolveLocation (loc: Location): Promise<Location | undefined> {
  const split = loc.fragment?.split('|') ?? []
  const app = loc.path[2]
  if (app !== trackerId && split[0] !== trackerId) {
    return undefined
  }

  const shortLink = split[1] ?? loc.fragment
  if (shortLink === undefined || shortLink === null || shortLink.trim() === '') {
    checkOld(loc)
    return undefined
  }

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
