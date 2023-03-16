import { chunterId, ChunterMessage, Comment, ThreadMessage } from '@hcengineering/chunter'
import contact, { EmployeeAccount, getName } from '@hcengineering/contact'
import {
  Class,
  Client,
  Doc,
  getCurrentAccount,
  matchQuery,
  Obj,
  Ref,
  SortingOrder,
  Space,
  Timestamp
} from '@hcengineering/core'
import { Asset } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { getCurrentLocation, navigate, Location, getPanelURI } from '@hcengineering/ui'
import { workbenchId } from '@hcengineering/workbench'
import view from '@hcengineering/view'
import { get, writable } from 'svelte/store'

import chunter from './plugin'

export function getTime (time: number): string {
  let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  if (!isToday(time)) {
    options = {
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  }

  return new Date(time).toLocaleString('default', options)
}

export function isToday (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return (
    current.getDate() === target.getDate() &&
    current.getMonth() === target.getMonth() &&
    current.getFullYear() === target.getFullYear()
  )
}

export function classIcon (client: Client, _class: Ref<Class<Obj>>): Asset | undefined {
  return client.getHierarchy().getClass(_class).icon
}

export async function getDmName (client: Client, dm: Space): Promise<string> {
  const myAccId = getCurrentAccount()._id

  let employeeAccounts: EmployeeAccount[] = await client.findAll(contact.class.EmployeeAccount, {
    _id: { $in: dm.members as Array<Ref<EmployeeAccount>> }
  })

  if (dm.members.length > 1) {
    employeeAccounts = employeeAccounts.filter((p) => p._id !== myAccId)
  }

  const emloyees = await client.findAll(contact.class.Employee, {
    _id: { $in: employeeAccounts.map((p) => p.employee) }
  })

  const name = emloyees.map((a) => getName(a)).join(', ')

  return name
}

export function getDay (time: Timestamp): Timestamp {
  const date: Date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function openMessageFromSpecial (message: ChunterMessage): void {
  const loc = getCurrentLocation()

  if (message.attachedToClass === chunter.class.ChunterSpace) {
    loc.path.length = 4
    loc.path[3] = message.attachedTo
  } else if (message.attachedToClass === chunter.class.Message) {
    loc.path.length = 5
    loc.path[3] = message.space
    loc.path[4] = message.attachedTo
  }
  navigate(loc)
}

export function navigateToSpecial (specialId: string): void {
  const loc = getCurrentLocation()
  loc.path[3] = specialId
  navigate(loc)
}

export enum SearchType {
  Messages,
  Channels,
  Files,
  Contacts
}

export const messageIdForScroll = writable('')
export const shouldScrollToMessage = writable(false)
export const isMessageHighlighted = writable(false)

let highlightFinishTaskId: number

export function scrollAndHighLight (): void {
  const messageElement = document.getElementById(get(messageIdForScroll))

  if (messageElement == null) {
    return
  }
  messageElement.scrollIntoView()
  shouldScrollToMessage.set(false)

  clearTimeout(highlightFinishTaskId)
  isMessageHighlighted.set(true)

  highlightFinishTaskId = window.setTimeout(() => {
    isMessageHighlighted.set(false)
  }, 2000)
}

export async function getLink (doc: Doc): Promise<string> {
  const fragment = await getFragment(doc)
  const location = getCurrentLocation()
  return await Promise.resolve(
    `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${chunterId}#${fragment}`
  )
}

export async function getFragment (doc: Doc): Promise<string> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  let clazz = hierarchy.getClass(doc._class)
  let label = clazz.shortLabel
  while (label === undefined && clazz.extends !== undefined) {
    clazz = hierarchy.getClass(clazz.extends)
    label = clazz.shortLabel
  }
  label = label ?? doc._class
  let length = 5
  let id = doc._id.slice(-length)
  const contacts = await client.findAll(chunter.class.Comment, {}, { projection: { _id: 1 } })
  let res = matchQuery(contacts, { _id: { $like: `@${id}` } }, chunter.class.Comment, hierarchy)
  while (res.length > 1) {
    length++
    id = doc._id.slice(-length)
    res = matchQuery(contacts, { _id: { $like: `@${id}` } }, chunter.class.Comment, hierarchy)
  }

  return `${chunterId}|${label}-${id}`
}

export async function resolveLocation (loc: Location): Promise<Location | undefined> {
  const split = loc.fragment?.split('|') ?? []
  if (split[0] !== chunterId) {
    return undefined
  }

  const shortLink = split[1]

  // shortlink
  if (isShortId(shortLink)) {
    return await generateLocation(loc, shortLink)
  }

  return undefined
}

async function generateLocation (loc: Location, shortLink: string): Promise<Location | undefined> {
  const tokens = shortLink.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const classLabel = tokens[0]
  const lastId = tokens[1]
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const classes = [chunter.class.Message, chunter.class.ThreadMessage, chunter.class.Comment]
  let _class: Ref<Class<Doc>> | undefined
  for (const clazz of classes) {
    if (hierarchy.getClass(clazz).shortLabel === classLabel) {
      _class = clazz
      break
    }
  }
  if (_class === undefined) {
    console.error(`Could not find class ${classLabel}.`)
    return undefined
  }
  const doc = await client.findOne(_class, { _id: { $like: `%${lastId}` } }, { sort: { _id: SortingOrder.Descending } })
  if (doc === undefined) {
    console.error(`Could not find message ${lastId}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  if (hierarchy.isDerived(doc._class, chunter.class.Message)) {
    return {
      path: [appComponent, workspace, chunterId, doc.space],
      fragment: doc._id
    }
  }
  if (hierarchy.isDerived(doc._class, chunter.class.Comment)) {
    const comment = doc as Comment
    const targetClass = hierarchy.getClass(comment.attachedToClass)
    const panelComponent = hierarchy.as(targetClass, view.mixin.ObjectPanel)
    const component = panelComponent.component ?? view.component.EditDoc
    return {
      path: [appComponent, workspace],
      fragment: getPanelURI(component, comment.attachedTo, comment.attachedToClass, 'content')
    }
  }
  if (hierarchy.isDerived(doc._class, chunter.class.ThreadMessage)) {
    const msg = doc as ThreadMessage
    return {
      path: [appComponent, workspace, chunterId, doc.space, msg.attachedTo],
      fragment: doc._id
    }
  }
}

function isShortId (shortLink: string): boolean {
  return /^\w+-\w+$/.test(shortLink)
}
