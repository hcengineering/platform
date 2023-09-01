import { chunterId, ChunterMessage, Comment, ThreadMessage } from '@hcengineering/chunter'
import contact, { Employee, PersonAccount, getName } from '@hcengineering/contact'
import { employeeByIdStore } from '@hcengineering/contact-resources'
import { Class, Client, Doc, getCurrentAccount, IdMap, Obj, Ref, Space, Timestamp } from '@hcengineering/core'
import { Asset } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import {
  getPanelURI,
  getLocation,
  Location,
  navigate,
  ResolvedLocation,
  getCurrentResolvedLocation
} from '@hcengineering/ui'
import view from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'
import { get, Unsubscriber, writable } from 'svelte/store'

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

  let employeeAccounts: PersonAccount[] = await client.findAll(contact.class.PersonAccount, {
    _id: { $in: dm.members as Array<Ref<PersonAccount>> }
  })

  if (dm.members.length > 1) {
    employeeAccounts = employeeAccounts.filter((p) => p._id !== myAccId)
  }

  let unsub: Unsubscriber | undefined
  const promise = new Promise<IdMap<Employee>>((resolve) => {
    unsub = employeeByIdStore.subscribe((p) => {
      if (p.size !== 0) {
        resolve(p)
      }
    })
  })

  const map = await promise

  unsub?.()

  const names: string[] = []

  for (const acc of employeeAccounts) {
    const employee = map.get(acc.person as unknown as Ref<Employee>)
    if (employee !== undefined) {
      names.push(getName(client.getHierarchy(), employee))
    }
  }
  const name = names.join(', ')

  return name
}

export function getDay (time: Timestamp): Timestamp {
  const date: Date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function openMessageFromSpecial (message: ChunterMessage): void {
  const loc = getLocation()

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
  const loc = getLocation()
  loc.path[2] = chunterId
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
  const fragment = await getTitle(doc)
  const location = getCurrentResolvedLocation()
  return await Promise.resolve(
    `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${chunterId}#${fragment}`
  )
}

export async function getFragment (doc: Doc): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = chunterId
  loc.fragment = await getTitle(doc)

  return loc
}

export async function getTitle (doc: Doc): Promise<string> {
  const client = getClient()
  const hierarchy = client.getHierarchy()
  let clazz = hierarchy.getClass(doc._class)
  let label = clazz.shortLabel
  while (label === undefined && clazz.extends !== undefined) {
    clazz = hierarchy.getClass(clazz.extends)
    label = clazz.shortLabel
  }
  label = label ?? doc._class
  return `${label}-${doc._id}`
}

export async function resolveLocation (loc: Location): Promise<ResolvedLocation | undefined> {
  if (loc.path[2] !== chunterId) {
    return undefined
  }

  const shortLink = loc.fragment

  // shortlink
  if (shortLink !== undefined && isShortId(shortLink)) {
    return await generateLocation(loc, shortLink)
  }

  return undefined
}

async function generateLocation (loc: Location, shortLink: string): Promise<ResolvedLocation | undefined> {
  const tokens = shortLink.split('-')
  if (tokens.length < 2) {
    return undefined
  }
  const classLabel = tokens[0]
  const lastId = tokens.slice(1).join('-') as Ref<Doc>
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
  const doc = await client.findOne(_class, { _id: lastId })
  if (doc === undefined) {
    console.error(`Could not find message ${lastId}.`)
    return undefined
  }
  const appComponent = loc.path[0] ?? ''
  const workspace = loc.path[1] ?? ''

  if (hierarchy.isDerived(doc._class, chunter.class.Message)) {
    return {
      loc: {
        path: [appComponent, workspace, chunterId, doc.space],
        fragment: doc._id
      },
      defaultLocation: {
        path: [appComponent, workspace, chunterId, doc.space],
        fragment: doc._id
      }
    }
  }
  if (hierarchy.isDerived(doc._class, chunter.class.Comment)) {
    const comment = doc as Comment
    const panelComponent = hierarchy.classHierarchyMixin(comment.attachedToClass, view.mixin.ObjectPanel)
    const component = panelComponent?.component ?? view.component.EditDoc
    return {
      loc: {
        path: [appComponent, workspace],
        fragment: getPanelURI(component, comment.attachedTo, comment.attachedToClass, 'content')
      },
      defaultLocation: {
        path: [appComponent, workspace],
        fragment: getPanelURI(component, comment.attachedTo, comment.attachedToClass, 'content')
      }
    }
  }
  if (hierarchy.isDerived(doc._class, chunter.class.ThreadMessage)) {
    const msg = doc as ThreadMessage
    return {
      loc: {
        path: [appComponent, workspace, chunterId, doc.space, msg.attachedTo],
        fragment: doc._id
      },
      defaultLocation: {
        path: [appComponent, workspace, chunterId, doc.space],
        fragment: doc._id
      }
    }
  }
}

function isShortId (shortLink: string): boolean {
  return /^\S+-\S+$/.test(shortLink)
}

export function getLinks (content: string): HTMLLinkElement[] {
  const parser = new DOMParser()
  const parent = parser.parseFromString(content, 'text/html').firstChild?.childNodes[1] as HTMLElement
  return parseLinks(parent.childNodes)
}

function parseLinks (nodes: NodeListOf<ChildNode>): HTMLLinkElement[] {
  const res: HTMLLinkElement[] = []
  nodes.forEach((p) => {
    if (p.nodeType !== Node.TEXT_NODE) {
      if (p.nodeName === 'A') {
        res.push(p as HTMLLinkElement)
      }
      res.push(...parseLinks(p.childNodes))
    }
  })
  return res
}
