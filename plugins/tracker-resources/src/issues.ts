import { Doc, Ref, TxOperations } from '@anticrm/core'
import { getClient } from '@anticrm/presentation'
import { Issue, Team, trackerId } from '@anticrm/tracker'
import { getCurrentLocation, getPanelURI, Location } from '@anticrm/ui'
import { workbenchId } from '@anticrm/workbench'
import tracker from './plugin'

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

export async function copyToClipboard (object: Issue, ev: Event, { type }: { type: string }): Promise<void> {
  const client = getClient()
  let text: string
  switch (type) {
    case 'id':
      text = await getIssueTitle(client, object._id)
      break
    case 'title':
      text = object.title
      break
    case 'link':
      text = generateIssueShortLink(await getIssueTitle(client, object._id))
      break
    default:
      return
  }
  await navigator.clipboard.writeText(text)
}

export function generateIssueShortLink (issueId: string): string {
  const location = getCurrentLocation()
  return `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${trackerId}/${issueId}`
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

export async function resolveLocation (loc: Location): Promise<Location | undefined> {
  const app = loc.path.length > 2 ? loc.path[2] : undefined
  if (app !== trackerId) {
    return undefined
  }

  const shortLink = loc.path.length > 3 ? loc.path[3] : undefined
  if (shortLink === undefined || shortLink === null) {
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
  id: Ref<Issue>,
  prop: 'blockedBy' | 'relatedIssue',
  operation: '$push' | '$pull'
): Promise<void> {
  const update = Array.isArray(value[prop])
    ? { [operation]: { [prop]: id } }
    : { [prop]: operation === '$push' ? [id] : [] }
  await client.update(value, update)
}
