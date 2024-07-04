import core, {
  getCurrentAccount,
  isOtherHour,
  type Doc,
  type Ref,
  type TxOperations,
  type Client
} from '@hcengineering/core'
import type { ActivityMessage, Reaction, GroupMessagesResources } from '@hcengineering/activity'
import { getClient } from '@hcengineering/presentation'
import {
  EmojiPopup,
  closePopup,
  getCurrentResolvedLocation,
  getEventPositionElement,
  showPopup,
  type Location
} from '@hcengineering/ui'
import { get } from 'svelte/store'
import { getResource } from '@hcengineering/platform'

import { savedMessagesStore } from './activity'
import activity from './plugin'

export async function updateDocReactions (
  client: TxOperations,
  reactions: Reaction[],
  object?: Doc,
  emoji?: string
): Promise<void> {
  if (emoji === undefined || object === undefined) {
    return
  }

  const currentAccount = getCurrentAccount()

  const reaction = reactions.find((r) => r.emoji === emoji && r.createBy === currentAccount._id)

  if (reaction == null) {
    await client.addCollection(activity.class.Reaction, object.space, object._id, object._class, 'reactions', {
      emoji,
      createBy: currentAccount._id
    })
  } else {
    await client.remove(reaction)
  }
}

export function getMessageFromLoc (loc: Location): Ref<ActivityMessage> | undefined {
  return (loc.query?.message ?? undefined) as Ref<ActivityMessage> | undefined
}

interface ActivityMessageActionParams {
  onClose?: () => void
  onOpen?: () => void
}

export async function addReactionAction (
  message?: ActivityMessage,
  ev?: MouseEvent,
  params?: ActivityMessageActionParams
): Promise<void> {
  if (message === undefined || ev === undefined) return

  const client = getClient()
  const reactions: Reaction[] =
    (message.reactions ?? 0) > 0
      ? await client.findAll<Reaction>(activity.class.Reaction, { attachedTo: message._id })
      : []
  const element = getEventPositionElement(ev)

  closePopup()

  showPopup(EmojiPopup, {}, element, (emoji: string) => {
    void updateDocReactions(client, reactions, message, emoji)
    params?.onClose?.()
  })
  params?.onOpen?.()
}

export async function saveForLater (message?: ActivityMessage): Promise<void> {
  if (message === undefined) return
  closePopup()
  const client = getClient()

  await client.createDoc(activity.class.SavedMessage, core.space.Workspace, {
    attachedTo: message._id
  })
}

export async function removeFromSaved (message?: ActivityMessage): Promise<void> {
  if (message === undefined) return
  closePopup()
  const client = getClient()
  const saved = get(savedMessagesStore).find((saved) => saved.attachedTo === message._id)

  if (saved !== undefined) {
    await client.removeDoc(saved._class, saved.space, saved._id)
  }
}

export async function canSaveForLater (message?: ActivityMessage): Promise<boolean> {
  if (message === undefined) return false

  const saved = get(savedMessagesStore).find((saved) => saved.attachedTo === message._id)

  return saved === undefined
}

export async function canRemoveFromSaved (message?: ActivityMessage): Promise<boolean> {
  if (message === undefined) return false

  return !(await canSaveForLater(message))
}

export async function canPinMessage (message?: ActivityMessage): Promise<boolean> {
  return message !== undefined && message.isPinned !== true
}

export async function canUnpinMessage (message?: ActivityMessage): Promise<boolean> {
  return message !== undefined && message.isPinned === true
}

export async function pinMessage (message?: ActivityMessage): Promise<void> {
  if (message === undefined) return
  closePopup()
  const client = getClient()

  await client.update(message, { isPinned: true })
}

export async function unpinMessage (message?: ActivityMessage): Promise<void> {
  if (message === undefined) return
  closePopup()
  const client = getClient()

  await client.update(message, { isPinned: false })
}

const groupMessagesThresholdMs = 15 * 60 * 1000

function canGroupActivityMessages (message: ActivityMessage, prevMessage: ActivityMessage): boolean {
  const time1 = message.createdOn ?? message.modifiedOn
  const time2 = prevMessage.createdOn ?? prevMessage.modifiedOn

  if (isOtherHour(time1, time2)) {
    return false
  }

  return time1 - time2 < groupMessagesThresholdMs
}

export async function getGroupMessagesResources (client: Client): Promise<GroupMessagesResources> {
  const providers = client.getModel().findAllSync(activity.mixin.ActivityMessageGroupProvider, {})
  const result: GroupMessagesResources = new Map()

  for (const provider of providers) {
    const fn = await getResource(provider.fn)

    result.set(provider._id, fn)
  }

  return result
}

export function canGroupMessages (
  message: ActivityMessage,
  prevMessage: ActivityMessage | undefined,
  resources: GroupMessagesResources = new Map()
): boolean {
  if (prevMessage === undefined) {
    return false
  }

  if (message.createdBy !== prevMessage.createdBy || message._class !== prevMessage._class) {
    return false
  }

  const canGroup = canGroupActivityMessages(message, prevMessage)

  if (!canGroup) return false

  const { _class } = message
  const fn = resources.get(_class)

  if (fn === undefined) return canGroup

  return fn(message, prevMessage)
}

export function shouldScrollToActivity (): boolean {
  const loc = getCurrentResolvedLocation()
  return getMessageFromLoc(loc) !== undefined
}
