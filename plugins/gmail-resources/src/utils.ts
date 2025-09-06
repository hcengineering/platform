import { get } from 'svelte/store'
import { getName as getContactName } from '@hcengineering/contact'
import contact, { type Channel, type Contact } from '@hcengineering/contact'
import { employeeBySocialKeyStore, getPersonByPersonId } from '@hcengineering/contact-resources'
import { buildSocialIdString, type PersonId, SocialIdType, type Client, type Doc, type Ref } from '@hcengineering/core'
import { type Message, type SharedMessage } from '@hcengineering/gmail'
import { getClient } from '@hcengineering/presentation'
import type { Integration } from '@hcengineering/account-client'

import gmail from './plugin'

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

export async function convertMessages (
  object: Contact,
  channel: Channel,
  messages: Message[]
): Promise<SharedMessage[]> {
  const res: SharedMessage[] = []
  for (const m of messages) {
    res.push({
      ...m,
      _id: m._id as string as Ref<SharedMessage>,
      sender: await getName(object, channel, m, true),
      receiver: await getName(object, channel, m, false)
    })
  }
  return res
}

export async function convertMessage (object: Contact, channel: Channel, message: Message): Promise<SharedMessage> {
  return {
    ...message,
    _id: message._id as string as Ref<SharedMessage>,
    sender: await getName(object, channel, message, true),
    receiver: await getName(object, channel, message, false)
  }
}

export async function getName (object: Contact, channel: Channel, message: Message, sender: boolean): Promise<string> {
  const h = getClient().getHierarchy()
  if (message._class === gmail.class.NewMessage) {
    if (!sender) return `${getContactName(h, object)} (${channel.value})`
    return await getPersonName(message.from ?? message.createdBy ?? message.modifiedBy)
  }
  if (message.incoming === sender) {
    return `${getContactName(h, object)} (${channel.value})`
  } else {
    return await getPersonName(message.modifiedBy)
  }
}

export async function getPersonName (emailOrId: string): Promise<string> {
  const personName = (await getPersonByPersonId(emailOrId as PersonId))?.name
  if (personName != null) return personName
  const emailSearch = emailOrId.match(EMAIL_REGEX)
  const email = emailSearch?.[0]
  if (email != null && email !== '') {
    const socialId = buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
    const name = get(employeeBySocialKeyStore).get(socialId)?.name
    if (name != null) return name
  }
  return emailOrId
}

export async function MessageTitleProvider (client: Client, ref: Ref<Message>, doc?: Message): Promise<string> {
  const object = doc ?? (await client.findOne(gmail.class.Message, { _id: ref }))

  return object?.subject ?? ''
}

export function isNewGmailIntegration (integration: Integration): boolean {
  return integration.data?.integrationVersion === 'v2'
}
