import contact, { Channel, Employee, Contact, PersonAccount, getName as getContactName } from '@hcengineering/contact'
import { Doc, IdMap, Ref, toIdMap } from '@hcengineering/core'
import { Message, SharedMessage } from '@hcengineering/gmail'
import { getClient } from '@hcengineering/presentation'

export function getTime (time: number): string {
  let options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' }
  if (!isCurrentYear(time)) {
    options = {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      ...options
    }
  } else if (!isToday(time)) {
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

export function isCurrentYear (time: number): boolean {
  const current = new Date()
  const target = new Date(time)
  return current.getFullYear() === target.getFullYear()
}

export async function checkHasEmail (doc: Doc | Doc[] | undefined): Promise<boolean> {
  if (doc === undefined) return false
  const client = getClient()
  const arr = Array.isArray(doc) ? doc.map((p) => p._id) : [doc._id]
  const res = await client.findAll(
    contact.class.Channel,
    {
      provider: contact.channelProvider.Email,
      attachedTo: { $in: arr }
    },
    { projection: { _id: 1, attachedTo: 1 } }
  )
  const set = new Set(res.map((p) => p.attachedTo))
  for (const val of arr) {
    if (!set.has(val)) return false
  }
  return true
}

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/

export function convertMessages (
  object: Contact,
  channel: Channel,
  messages: Message[],
  accounts: IdMap<PersonAccount>,
  employees: IdMap<Employee>
): SharedMessage[] {
  return messages.map((m) => {
    return {
      ...m,
      _id: m._id as string as Ref<SharedMessage>,
      sender: getName(object, channel, m, accounts, employees, true),
      receiver: getName(object, channel, m, accounts, employees, false)
    }
  })
}

export async function convertMessage (
  object: Contact,
  channel: Channel,
  message: Message,
  employees: IdMap<Employee>
): Promise<SharedMessage> {
  const client = getClient()
  const accounts = toIdMap(await client.findAll(contact.class.PersonAccount, {}))
  return {
    ...message,
    _id: message._id as string as Ref<SharedMessage>,
    sender: getName(object, channel, message, accounts, employees, true),
    receiver: getName(object, channel, message, accounts, employees, false)
  }
}

export function getName (
  object: Contact,
  channel: Channel,
  message: Message,
  accounts: IdMap<PersonAccount>,
  employees: IdMap<Employee>,
  sender: boolean
): string {
  const h = getClient().getHierarchy()
  if (message.incoming === sender) {
    return `${getContactName(h, object)} (${channel.value})`
  } else {
    const account = accounts.get(message.modifiedBy as Ref<PersonAccount>)
    const emp = account != null ? employees.get(account?.person as Ref<Employee>) : undefined
    const value = message.incoming ? message.to : message.from
    const email = value.match(EMAIL_REGEX)
    const emailVal = email?.[0] ?? value
    return emp != null ? `${getContactName(h, emp)} (${emailVal})` : emailVal
  }
}
