import { chunterId, ChunterMessage } from '@hcengineering/chunter'
import contact, { EmployeeAccount, getName } from '@hcengineering/contact'
import { Class, Client, getCurrentAccount, Obj, Ref, Space, Timestamp } from '@hcengineering/core'
import { Asset } from '@hcengineering/platform'
import { getCurrentLocation, locationToUrl, navigate } from '@hcengineering/ui'
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

export function getSpaceLink (id: Ref<Space>): string {
  const loc = getCurrentLocation()

  loc.path[2] = chunterId
  loc.path[3] = id
  loc.path.length = 4
  loc.fragment = undefined

  return locationToUrl(loc)
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
