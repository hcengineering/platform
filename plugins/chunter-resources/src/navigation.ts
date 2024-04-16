import { getCurrentLocation, getCurrentResolvedLocation, getLocation, type Location, navigate } from '@hcengineering/ui'
import { type Ref, type Doc, type Class } from '@hcengineering/core'
import type { ActivityMessage } from '@hcengineering/activity'
import { chunterId, type ChunterSpace, type ThreadMessage } from '@hcengineering/chunter'
import { notificationId } from '@hcengineering/notification'
import { workbenchId } from '@hcengineering/workbench'

import { chatSpecials } from './components/chat/utils'
import { isThreadMessage } from './utils'

export function decodeChannelURI (value: string): [Ref<Doc>, Ref<Class<Doc>>] {
  return decodeURIComponent(value).split('|') as [Ref<Doc>, Ref<Class<Doc>>]
}

function encodeChannelURI (_id: Ref<Doc>, _class: Ref<Class<Doc>>): string {
  return encodeURIComponent([_id, _class].join('|'))
}

export function openChannel (_id: Ref<Doc>, _class: Ref<Class<Doc>>): void {
  const loc = getCurrentLocation()

  const id = encodeChannelURI(_id, _class)

  if (loc.path[3] === id) {
    return
  }

  loc.path[3] = id
  loc.path[4] = ''
  loc.query = { ...loc.query, message: null }
  loc.path.length = 4

  navigate(loc)
}

export async function openMessageFromSpecial (message?: ActivityMessage): Promise<void> {
  if (message === undefined) {
    return
  }

  const loc = getCurrentResolvedLocation()

  if (isThreadMessage(message)) {
    loc.path[3] = encodeChannelURI(message.objectId, message.objectClass)
    loc.path[4] = message.attachedTo
  } else {
    loc.path[3] = encodeChannelURI(message.attachedTo, message.attachedToClass)
  }

  loc.query = { ...loc.query, message: message._id }

  navigate(loc)
}

export function navigateToSpecial (specialId: string): void {
  const loc = getLocation()
  loc.path[2] = chunterId
  loc.path[3] = specialId
  navigate(loc)
}

export async function getMessageLink (message: ActivityMessage): Promise<string> {
  const location = getCurrentResolvedLocation()

  let threadParent = ''
  let _id: Ref<Doc>
  let _class: Ref<Class<Doc>>

  if (isThreadMessage(message)) {
    threadParent = `/${message.attachedTo}`
    _id = message.objectId
    _class = message.objectClass
  } else {
    _id = message.attachedTo
    _class = message.attachedToClass
  }

  const id = encodeChannelURI(_id, _class)

  return `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${chunterId}/${id}${threadParent}?message=${message._id}`
}

export async function chunterSpaceLinkFragmentProvider (doc: ChunterSpace): Promise<Location> {
  const loc = getCurrentResolvedLocation()

  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = chunterId
  loc.path[3] = encodeChannelURI(doc._id, doc._class)

  return loc
}

export function buildThreadLink (
  loc: Location,
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  threadParent: Ref<ActivityMessage>
): Location {
  const specials = chatSpecials.map(({ id }) => id)
  const id = encodeChannelURI(_id, _class)
  const isSameChannel = loc.path[3] === id

  if (!isSameChannel) {
    loc.query = { message: threadParent }
  }

  if (loc.path[2] === chunterId && specials.includes(loc.path[3])) {
    loc.path[4] = threadParent
    return loc
  }

  if (loc.path[2] !== notificationId) {
    loc.path[2] = chunterId
  }

  loc.path[3] = id
  loc.path[4] = threadParent
  loc.fragment = undefined

  return loc
}

export async function getThreadLink (doc: ThreadMessage): Promise<Location> {
  const loc = getCurrentResolvedLocation()

  return buildThreadLink(loc, doc.objectId, doc.objectClass, doc.attachedTo)
}

export async function replyToThread (message: ActivityMessage): Promise<void> {
  const loc = getCurrentLocation()

  if (loc.path[2] !== notificationId) {
    loc.path[2] = chunterId
  }

  navigate(buildThreadLink(loc, message.attachedTo, message.attachedToClass, message._id))
}

export async function getMessageLocation (doc: ActivityMessage): Promise<Location> {
  const loc = getCurrentResolvedLocation()

  return buildThreadLink(loc, doc.attachedTo, doc.attachedToClass, doc._id)
}
