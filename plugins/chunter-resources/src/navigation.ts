import {
  closePanel,
  getCurrentLocation,
  getCurrentResolvedLocation,
  getLocation,
  type Location,
  navigate
} from '@hcengineering/ui'
import { type Ref, type Doc, type Class } from '@hcengineering/core'
import type { ActivityMessage } from '@hcengineering/activity'
import { chunterId, type ChunterSpace, type ThreadMessage } from '@hcengineering/chunter'
import { notificationId } from '@hcengineering/notification'
import { workbenchId } from '@hcengineering/workbench'
import { getObjectLinkId } from '@hcengineering/view-resources'
import { getClient } from '@hcengineering/presentation'
import view, { encodeObjectURI, decodeObjectURI } from '@hcengineering/view'

import { chatSpecials } from './components/chat/utils'
import { isThreadMessage } from './utils'

export function openChannel (_id: string, _class: Ref<Class<Doc>>, thread?: Ref<ActivityMessage>): void {
  const loc = getCurrentLocation()
  const id = encodeObjectURI(_id, _class)

  if (loc.path[3] === id) {
    return
  }

  loc.path[3] = id
  loc.query = { ...loc.query, message: null }

  if (thread !== undefined) {
    loc.path[4] = thread
    loc.path.length = 5
  } else {
    loc.path[4] = ''
    loc.path.length = 4
  }

  navigate(loc)
}

export async function openMessageFromSpecial (message?: ActivityMessage): Promise<void> {
  if (message === undefined) {
    return
  }

  const loc = getCurrentResolvedLocation()
  const client = getClient()
  const providers = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  if (isThreadMessage(message)) {
    const id = await getObjectLinkId(providers, message.objectId, message.objectClass)

    loc.path[3] = encodeObjectURI(id, message.objectClass)
    loc.path[4] = message.attachedTo
  } else {
    const id = await getObjectLinkId(providers, message.attachedTo, message.attachedToClass)

    loc.path[3] = encodeObjectURI(id, message.attachedToClass)
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
  const client = getClient()
  const location = getCurrentResolvedLocation()
  const providers = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  let threadParent = ''
  let _id: string
  let _class: Ref<Class<Doc>>

  if (isThreadMessage(message)) {
    threadParent = `/${message.attachedTo}`
    _id = await getObjectLinkId(providers, message.objectId, message.objectClass)
    _class = message.objectClass
  } else {
    _id = await getObjectLinkId(providers, message.attachedTo, message.attachedToClass)
    _class = message.attachedToClass
  }

  const id = encodeObjectURI(_id, _class)

  return `${window.location.protocol}//${window.location.host}/${workbenchId}/${location.path[1]}/${chunterId}/${id}${threadParent}?message=${message._id}`
}

export async function chunterSpaceLinkFragmentProvider (doc: ChunterSpace): Promise<Location> {
  const loc = getCurrentResolvedLocation()
  const client = getClient()
  const providers = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  const id = await getObjectLinkId(providers, doc._id, doc._class, doc)

  loc.path.length = 2
  loc.fragment = undefined
  loc.query = undefined
  loc.path[2] = chunterId
  loc.path[3] = encodeObjectURI(id, doc._class)

  return loc
}

export async function buildThreadLink (
  loc: Location,
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  threadParent: Ref<ActivityMessage>,
  doc?: Doc
): Promise<Location> {
  const client = getClient()
  const providers = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
  const id = await getObjectLinkId(providers, _id, _class, doc)

  const specials = chatSpecials.map(({ id }) => id)
  const objectURI = encodeObjectURI(id, _class)
  const isSameChannel = loc.path[3] === objectURI

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

  loc.path[3] = objectURI
  loc.path[4] = threadParent
  loc.fragment = undefined

  return loc
}

export async function getThreadLink (doc: ThreadMessage): Promise<Location> {
  const loc = getCurrentResolvedLocation()

  return await buildThreadLink(loc, doc.objectId, doc.objectClass, doc.attachedTo, doc)
}

export async function replyToThread (message: ActivityMessage): Promise<void> {
  const loc = getCurrentLocation()

  if (loc.path[2] !== notificationId) {
    loc.path[2] = chunterId
  }

  const newLoc = await buildThreadLink(loc, message.attachedTo, message.attachedToClass, message._id)

  navigate(newLoc)
}

export async function getMessageLocation (doc: ActivityMessage): Promise<Location> {
  const loc = getCurrentResolvedLocation()

  return await buildThreadLink(loc, doc.attachedTo, doc.attachedToClass, doc._id)
}

export async function resetChunterLocIfEqual (_id: Ref<Doc>, _class: Ref<Class<Doc>>, doc?: Doc): Promise<void> {
  const loc = getCurrentLocation()

  if (loc.path[2] !== chunterId) {
    return
  }

  const client = getClient()
  const providers = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})
  const id = await getObjectLinkId(providers, _id, _class, doc)

  const [locId] = decodeObjectURI(loc.path[3])

  if (locId !== id) {
    return
  }

  loc.path[3] = ''
  loc.path[4] = ''
  loc.query = {}
  loc.path.length = 3
  closePanel()
  navigate(loc)
}
