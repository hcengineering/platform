import { chunterId, ChunterMessage } from '@anticrm/chunter'
import contact, { EmployeeAccount, formatName } from '@anticrm/contact'
import { Account, Class, Client, Obj, Ref, Space, getCurrentAccount, Timestamp } from '@anticrm/core'
import { Asset } from '@anticrm/platform'
import { getCurrentLocation, locationToUrl, navigate } from '@anticrm/ui'
import { writable, get } from 'svelte/store'

import chunter from './plugin'

export async function getUser (
  client: Client,
  user: Ref<EmployeeAccount> | Ref<Account>
): Promise<EmployeeAccount | undefined> {
  return await client.findOne(contact.class.EmployeeAccount, { _id: user as Ref<EmployeeAccount> })
}

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

  const employeeAccounts = await client.findAll(contact.class.EmployeeAccount, {
    _id: { $in: dm.members as Array<Ref<EmployeeAccount>> }
  })

  const name = (dm.members.length > 1 ? employeeAccounts.filter((a) => a._id !== myAccId) : employeeAccounts)
    .map((a) => formatName(a.name))
    .join(', ')

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
