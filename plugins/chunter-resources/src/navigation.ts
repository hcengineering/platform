import {
  closePanel,
  getCurrentLocation,
  getCurrentResolvedLocation,
  getLocation,
  type Location,
  navigate
} from '@hcengineering/ui'
import { type Ref, type Doc, type Class } from '@hcengineering/core'
import activity, { type ActivityMessage } from '@hcengineering/activity'
import {
  type Channel,
  type ChatWidgetTab,
  chunterId,
  type ChunterSpace,
  type ThreadMessage
} from '@hcengineering/chunter'
import { type DocNotifyContext, notificationId } from '@hcengineering/notification'
import workbench, { type Widget, workbenchId } from '@hcengineering/workbench'
import { classIcon, getObjectLinkId } from '@hcengineering/view-resources'
import { getClient } from '@hcengineering/presentation'
import view, { encodeObjectURI, decodeObjectURI } from '@hcengineering/view'
import { createWidgetTab, isElementFromSidebar, sidebarStore } from '@hcengineering/workbench-resources'
import { type Asset, translate } from '@hcengineering/platform'
import contact from '@hcengineering/contact'
import { get } from 'svelte/store'

import { chatSpecials } from './components/chat/utils'
import { getChannelName, isThreadMessage } from './utils'
import chunter from './plugin'

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

export async function replyToThread (message: ActivityMessage, e: Event): Promise<void> {
  const fromSidebar = isElementFromSidebar(e.target as HTMLElement)
  const loc = getCurrentLocation()

  if (fromSidebar) {
    const widget = getClient().getModel().findAllSync(workbench.class.Widget, { _id: chunter.ids.ChatWidget })[0]
    const widgetState = get(sidebarStore).widgetsState.get(widget._id)
    const tab = widgetState?.tabs.find((it) => it?.data?._id === message.attachedTo)
    if (tab !== undefined) {
      void openThreadInSidebarChannel(widget, tab as ChatWidgetTab, message)
      return
    }
  }

  void openThreadInSidebar(message._id, message)
  if (loc.path[2] !== chunterId && loc.path[2] !== notificationId) {
    return
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

function getChannelClassIcon (object: Doc): Asset | undefined {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  if (hierarchy.isDerived(object._class, chunter.class.Channel)) {
    return (object as Channel).private ? chunter.icon.Lock : chunter.icon.Hashtag
  }

  return classIcon(client, object._class)
}

export async function openChannelInSidebar (
  _id: Ref<Doc>,
  _class: Ref<Class<Doc>>,
  doc?: Doc,
  thread?: Ref<ActivityMessage>,
  newTab = true
): Promise<void> {
  const client = getClient()

  const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: chunter.ids.ChatWidget })[0]
  if (widget === undefined) return

  const object = doc ?? (await client.findOne(_class, { _id }))
  if (object === undefined) return

  const titleIntl = client.getHierarchy().getClass(object._class).label
  const hierarchy = client.getHierarchy()
  const iconMixin = hierarchy.classHierarchyMixin(_class, view.mixin.ObjectIcon)
  const isPerson = hierarchy.isDerived(_class, contact.class.Person)
  const isDirect = hierarchy.isDerived(_class, chunter.class.DirectMessage)
  const isChannel = hierarchy.isDerived(_class, chunter.class.Channel)
  const name = (await getChannelName(_id, _class, object)) ?? (await translate(titleIntl, {}))

  const tab: ChatWidgetTab = {
    id: `chunter_${_id}`,
    name,
    icon: getChannelClassIcon(object),
    iconComponent: isChannel ? undefined : iconMixin?.component,
    iconProps: {
      _id: object._id,
      size: isDirect || isPerson ? 'tiny' : 'x-small',
      compact: true
    },
    type: 'channel',
    data: {
      _id,
      _class,
      thread
    }
  }

  createWidgetTab(widget, tab, newTab)
}

export async function openChannelInSidebarAction (
  context: DocNotifyContext,
  _: Event,
  props?: { object?: Doc }
): Promise<void> {
  await openChannelInSidebar(context.objectId, context.objectClass, props?.object, undefined, true)
}

export async function openThreadInSidebarChannel (
  widget: Widget,
  tab: ChatWidgetTab,
  message: ActivityMessage
): Promise<void> {
  const newTab: ChatWidgetTab = {
    ...tab,
    data: { ...tab.data, thread: message._id }
  }
  createWidgetTab(widget, newTab)
}

export async function closeThreadInSidebarChannel (widget: Widget, tab: ChatWidgetTab): Promise<void> {
  const newTab: ChatWidgetTab = {
    ...tab,
    data: { ...tab.data, thread: undefined }
  }

  createWidgetTab(widget, newTab)
}

export async function openThreadInSidebar (_id: Ref<ActivityMessage>, msg?: ActivityMessage, doc?: Doc): Promise<void> {
  const client = getClient()

  const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: chunter.ids.ChatWidget })[0]
  if (widget === undefined) return

  const message = msg ?? (await client.findOne(activity.class.ActivityMessage, { _id }))
  if (message === undefined) return

  const object = doc ?? (await client.findOne(message.attachedToClass, { _id: message.attachedTo }))
  if (object === undefined) return

  const titleIntl = client.getHierarchy().getClass(object._class).label
  const name = (await getChannelName(object._id, object._class, object)) ?? (await translate(titleIntl, {}))
  const tabName = await translate(chunter.string.ThreadIn, { name })
  const loc = getCurrentLocation()
  const allowedPath = loc.path.join('/')

  const currentTAbs = get(sidebarStore).widgetsState.get(widget._id)?.tabs ?? []
  const tabsToClose = currentTAbs
    .filter((t) => t.isPinned !== true && t.allowedPath === allowedPath && (t as ChatWidgetTab).type === 'thread')
    .map((t) => t.id)

  if (tabsToClose.length > 0) {
    sidebarStore.update((s) => {
      const widgetState = s.widgetsState.get(widget._id)
      if (widgetState === undefined) return s

      const tabs = widgetState.tabs.filter((it) => !tabsToClose.includes(it.id))
      s.widgetsState.set(widget._id, { ...widgetState, tabs })
      return { ...s }
    })
  }

  const tab: ChatWidgetTab = {
    id: 'thread_' + _id,
    name: tabName,
    icon: chunter.icon.Thread,
    allowedPath,
    type: 'thread',
    data: {
      _id: object?._id,
      _class: object?._class,
      thread: message._id
    }
  }
  createWidgetTab(widget, tab, true)
}

export function closeChatWidgetTab (tab?: ChatWidgetTab): void {
  if (tab?.type === 'thread') {
    const loc = getCurrentLocation()

    if (loc.path[2] === chunterId || loc.path[2] === notificationId) {
      if (loc.path[4] === tab.data.thread) {
        loc.path[4] = ''
        loc.path.length = 4
        navigate(loc)
      }
    }
  }
}
