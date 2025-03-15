//
// Copyright © 2024 Hardcore Engineering Inc.
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

import analyticsCollector, { AnalyticEvent, AnalyticEventType } from '@hcengineering/analytics-collector'
import chunter, { chunterId } from '@hcengineering/chunter'
import contact, { contactId } from '@hcengineering/contact'
import document, { documentId } from '@hcengineering/document'
import drive, { driveId } from '@hcengineering/drive'
import love, { loveId } from '@hcengineering/love'
import notification, { notificationId } from '@hcengineering/notification'
import recruit, { recruitId } from '@hcengineering/recruit'
import time, { timeId } from '@hcengineering/time'
import tracker, { trackerId } from '@hcengineering/tracker'
import workbench, { WorkbenchEvents } from '@hcengineering/workbench'
import { AccountUuid, Class, Doc, Hierarchy, Markup, Ref, TxOperations } from '@hcengineering/core'
import { MarkupNode, MarkupNodeType, MarkupMark, MarkupMarkType } from '@hcengineering/text'
import { translate } from '@hcengineering/platform'

export async function eventToMarkup (
  event: AnalyticEvent,
  hierarchy: Hierarchy,
  client: TxOperations
): Promise<Markup | undefined> {
  switch (event.event) {
    case AnalyticEventType.CustomEvent:
      return await formatCustomEvent(event, client)
    case AnalyticEventType.Error:
      return await formatErrorEvent(event)
    case AnalyticEventType.Navigation:
      return await formatNavigationEvent(event, hierarchy)
    case AnalyticEventType.SetTag:
      return await formatSetTagEvent(event)
    case AnalyticEventType.SetUser:
      return undefined
  }
}

function toMarkup (items: MarkupNode[]): Markup {
  return JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: items
      }
    ]
  })
}

function toText (text: string, display: 'normal' | 'bold' | 'code' = 'normal'): MarkupNode {
  const marks: MarkupMark[] = []
  if (display === 'bold') {
    marks.push({ type: MarkupMarkType.bold, attrs: {} })
  }

  if (display === 'code') {
    marks.push({ type: MarkupMarkType.code, attrs: {} })
  }

  return { type: MarkupNodeType.text, text, marks }
}

async function formatCustomEvent (event: AnalyticEvent, client: TxOperations): Promise<string | undefined> {
  const text = event.params.event as string | undefined

  if (text === undefined || text === '') return
  if (eventsToSkip.includes(event.params.event)) return
  if (sidebarEvents.includes(text)) {
    return await formatSidebarEvent(text, event.params, client)
  }

  const paramsTexts = []

  for (const key in event.params) {
    if (key !== 'event') {
      paramsTexts.push(`${key}: ${event.params[key]}`)
    }
  }

  if (paramsTexts.length === 0) {
    return toMarkup([toText(text)])
  }
  return toMarkup([toText(text + ' '), toText(paramsTexts.join(', '), 'code')])
}

async function formatSidebarEvent (
  event: string,
  params: Record<string, any>,
  client: TxOperations
): Promise<string | undefined> {
  let text = event
  switch (event) {
    case WorkbenchEvents.SidebarOpenWidget:
      text = 'open widget'
      break
    case WorkbenchEvents.SidebarCloseWidget:
      text = 'close widget'
      break
    default:
      break
  }
  const paramsTexts = []

  if (params.widget !== undefined) {
    const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: params.widget })[0]
    if (widget !== undefined) {
      const widgetName = await translate(widget.label, {})
      paramsTexts.push(`widget: ${widgetName}`)
    } else {
      paramsTexts.push(`widget: ${params.widget}`)
    }
  }

  if (params.tab !== undefined) {
    paramsTexts.push(`tab: ${params.tab}`)
  }

  return toMarkup([toText('Sidebar: ', 'bold'), toText(text + ' '), toText(paramsTexts.join(', '), 'code')])
}

async function formatErrorEvent (event: AnalyticEvent): Promise<string | undefined> {
  const error = event.params.error

  if (error === undefined || (typeof error === 'object' && Object.keys(error).length === 0)) {
    return
  }

  const text = await translate(analyticsCollector.string.Error, {})

  return toMarkup([toText(text), toText(error.message ?? JSON.stringify(error), 'code')])
}

async function formatSetTagEvent (event: AnalyticEvent): Promise<string | undefined> {
  const key = event.params.key

  if (key === undefined || key === '' || key === 'workspace') return

  const value = event.params.value
  const setLabel = await translate(analyticsCollector.string.Set, {})
  const toLabel = await translate(analyticsCollector.string.To, {})

  return toMarkup([toText(setLabel), toText(key, 'bold'), toText(toLabel), toText(value, 'bold')])
}

async function formatNavigationEvent (event: AnalyticEvent, hierarchy: Hierarchy): Promise<string | undefined> {
  const path = event.params.path as string | undefined

  if (path === undefined || path === '') return
  const location = parseLocation(new URL('http://localhost:8080' + path))

  if (location.path.length < 3) {
    return undefined
  }

  return toMarkup(await formatPath(location, hierarchy))
}

async function formatPath (location: Location, hierarchy: Hierarchy): Promise<MarkupNode[]> {
  const { path } = location

  const app = path[2]

  if (app === chunterId) {
    const app = await translate(chunter.string.Chat, {})
    return await formatLocWithThreads(location, hierarchy, app)
  }

  if (app === notificationId) {
    const app = await translate(notification.string.Inbox, {})
    return await formatLocWithThreads(location, hierarchy, app)
  }

  if (app === timeId) {
    return await formatTimeLoc(location, hierarchy)
  }

  if (app === loveId) {
    const app = await translate(love.string.Office, {})
    return await navigateToApp(app)
  }

  if (app === contactId) {
    return await formatContactsLoc(location)
  }

  if (app === recruitId) {
    return await formatRecruitLoc(location, hierarchy)
  }

  if (app === trackerId) {
    return await formatTrackerLoc(location, hierarchy)
  }

  if (app === documentId) {
    return await formatDocumentLoc(location, hierarchy)
  }

  if (app === 'team') {
    const app = await translate(time.string.Team, {})
    return await navigateToApp(app)
  }

  if (app === driveId) {
    return await formatDriveLoc(location)
  }

  return await formatDefaultLoc(location)
}

async function navigateToApp (app: string): Promise<MarkupNode[]> {
  const workbench = await translate(analyticsCollector.string.Workbench, {})

  return [toText(workbench, 'bold'), toText(app)]
}

async function navigateToSpecial (app: string, special: string, id?: string): Promise<MarkupNode[]> {
  const openSpecial = await translate(analyticsCollector.string.OpenSpecial, { special })

  return [
    toText(app, 'bold'),
    toText(': ', 'bold'),
    toText(openSpecial),
    ...(id !== undefined ? [toText(' '), toText(id, 'code')] : [])
  ]
}

async function formatLocWithThreads (location: Location, hierarchy: Hierarchy, app: string): Promise<MarkupNode[]> {
  const { path } = location

  if (path.length < 4) {
    return await navigateToApp(app)
  }

  const [_id, _class] = decodeURIComponent(path[3]).split('|')

  if (_id === undefined || _class === undefined) {
    return await navigateToSpecial(app, path[3])
  }

  const label = await translate(hierarchy.getClass(_class as Ref<Class<Doc>>).label, {})
  const thread = await translate(chunter.string.Thread, {})

  const openSpecial = await translate(analyticsCollector.string.OpenSpecial, { special: thread })

  return [
    ...(await navigateToSpecial(app, label, _id)),
    ...(path[4] !== undefined ? [toText(', '), toText(openSpecial), toText(path[4], 'code')] : [])
  ]
}

async function formatTimeLoc (location: Location, hierarchy: Hierarchy): Promise<MarkupNode[]> {
  const { fragment } = location
  const app = await translate(time.string.Planner, {})

  if (fragment === undefined || fragment === '') {
    return await navigateToApp(app)
  }

  const [, _id, _class] = decodeURIComponent(fragment).split('|')

  if (_id === undefined || _class === undefined) {
    return await navigateToApp(app)
  }

  const label = await translate(hierarchy.getClass(_class as Ref<Class<Doc>>).label, {})

  return await navigateToSpecial(app, label, _id)
}

async function formatRecruitLoc (location: Location, hierarchy: Hierarchy): Promise<MarkupNode[]> {
  const { path } = location
  const app = await translate(recruit.string.RecruitApplication, {})

  if (path.length < 4) {
    return await navigateToApp(app)
  }

  const applicationClass = hierarchy.getClass(recruit.class.Applicant)
  const vacancyClass = hierarchy.getClass(recruit.class.Vacancy)
  const reviewClass = hierarchy.getClass(recruit.class.Review)
  const talentClass = hierarchy.getClass(recruit.mixin.Candidate)
  const vacancyListClass = hierarchy.getClass(recruit.mixin.VacancyList)

  const [prefix] = path[3].split('-')
  let label: string | undefined

  if (prefix === applicationClass.shortLabel) {
    label = await translate(applicationClass.label, {})
  }

  if (prefix === vacancyClass.shortLabel) {
    label = await translate(vacancyClass.label, {})
  }

  if (prefix === reviewClass.shortLabel) {
    label = await translate(reviewClass.label, {})
  }

  if (prefix === talentClass.shortLabel) {
    label = await translate(talentClass.label, {})
  }

  if (prefix === vacancyListClass.shortLabel) {
    label = await translate(vacancyListClass.label, {})
  }

  if (label !== undefined) {
    return await navigateToSpecial(app, label, path[3])
  }

  return await navigateToSpecial(app, path[3])
}

async function formatTrackerLoc (location: Location, hierarchy: Hierarchy): Promise<MarkupNode[]> {
  const { path, fragment } = location
  const app = await translate(tracker.string.TrackerApplication, {})

  if (path.length < 4) {
    return await navigateToApp(app)
  }

  if (path.length === 4) {
    const issue = await translate(tracker.string.Issue, {})
    return await navigateToSpecial(app, issue, path[3])
  }

  const [, _id, _class] = fragment !== undefined ? decodeURIComponent(fragment).split('|') : []

  if (_id === undefined || _class === undefined) {
    const toSpecialLabel = await navigateToSpecial(app, path[4])
    const inProject = await translate(analyticsCollector.string.InProject, {})
    return [...toSpecialLabel, toText(inProject), toText(path[3], 'code')]
  }

  const clazz = hierarchy.getClass(_class as Ref<Class<Doc>>)
  const label = await translate(clazz.label, {})
  const openSpecial = await translate(analyticsCollector.string.OpenSpecial, { special: label })
  const inProject = await translate(analyticsCollector.string.InProject, {})

  return [
    toText(app, 'bold'),
    toText(': ', 'bold'),
    toText(openSpecial),
    toText(_id, 'code'),
    toText(inProject),
    toText(path[3], 'code')
  ]
}

async function formatDriveLoc (location: Location): Promise<MarkupNode[]> {
  const { path } = location
  const app = await translate(drive.string.Drive, {})

  if (path.length < 4) {
    return await navigateToApp(app)
  }

  if (path.length === 4) {
    return await navigateToSpecial(app, path[3])
  }

  const label = await translate(drive.string.Folder, {})

  return await navigateToSpecial(app, label, path[4])
}

async function formatContactsLoc (location: Location): Promise<MarkupNode[]> {
  const { path } = location
  const app = await translate(contact.string.Contacts, {})

  if (path.length < 4) {
    return await navigateToApp(app)
  }

  const spaces = ['employees', 'contacts', 'persons', 'companies']

  if (spaces.includes(path[3])) {
    return await navigateToSpecial(app, path[3])
  }

  return [
    toText(app, 'bold'),
    toText(': ', 'bold'),
    toText(await translate(analyticsCollector.string.Open, {})),
    toText(path[3], 'code')
  ]
}

async function formatDocumentLoc (location: Location, hierarchy: Hierarchy): Promise<MarkupNode[]> {
  const { path } = location
  const app = await translate(document.string.Documents, {})

  if (path.length < 4) {
    return await navigateToApp(app)
  }

  const clazz = hierarchy.getClass(document.class.Document)
  const label = await translate(clazz.label, {})
  return await navigateToSpecial(app, label, path[3])
}

async function formatDefaultLoc (location: Location, app?: string): Promise<MarkupNode[]> {
  const { path } = location
  if (path.length < 4) {
    return await navigateToApp(app ?? path[2])
  }

  return await navigateToSpecial(app ?? path[2], path[3])
}

export interface Location {
  path: string[]
  fragment?: string
}

export function parseLocation (location: URL): Location {
  return {
    path: parsePath(location.pathname),
    fragment: parseHash(location.hash)
  }
}

function parsePath (path: string): string[] {
  const split = path.split('/').map((ps) => decodeURIComponent(ps))
  if (split.length >= 1) {
    if (split[0] === '') {
      split.splice(0, 1)
    }
  }
  if (split.length >= 1) {
    if (split[split.length - 1] === '') {
      split.splice(split.length - 1, 1)
    }
  }
  return split
}

function parseHash (hash: string): string {
  if (hash.startsWith('#')) {
    return decodeURIComponent(hash.substring(1))
  }
  return decodeURIComponent(hash)
}

export function getOnboardingMessage (account: AccountUuid, workspace: string, name: string): Markup {
  const nodes: MarkupNode[] = [
    toText('New user for onboarding: '),
    toText('name', 'bold'),
    toText(' - '),
    toText(name),
    toText(', '),
    toText('account', 'bold'),
    toText(' - '),
    toText(account),
    toText(', '),
    toText('workspace', 'bold'),
    toText(' - '),
    toText(workspace)
  ]

  return toMarkup(nodes)
}

const eventsToSkip = [
  'Fetch workspace',
  'Create Tab',
  'Update Tab',
  'document.Opened',
  'Create Message',
  'chunter.MessageCreated',
  'Create Time',
  'Create Tag',
  'SetCollectionItems'
]

const sidebarEvents = [WorkbenchEvents.SidebarOpenWidget, WorkbenchEvents.SidebarCloseWidget] as string[]
