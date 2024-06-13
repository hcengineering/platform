import { get } from 'svelte/store'
import type { ActivityMessage, Reaction } from '@hcengineering/activity'
import core, { type Doc, type Ref, type TxOperations, getCurrentAccount, isOtherHour } from '@hcengineering/core'
import { getClient } from '@hcengineering/presentation'
import {
  type Location,
  getEventPositionElement,
  closePopup,
  showPopup,
  EmojiPopup,
  getCurrentResolvedLocation
} from '@hcengineering/ui'
import { type AttributeModel } from '@hcengineering/view'
import preference from '@hcengineering/preference'

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

  await client.createDoc(activity.class.SavedMessage, preference.space.Preference, {
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

export function getIsTextType (attributeModel?: AttributeModel): boolean {
  if (attributeModel === undefined) {
    return false
  }

  return (
    attributeModel.attribute?.type?._class === core.class.TypeMarkup ||
    attributeModel.attribute?.type?._class === core.class.TypeCollaborativeDoc
  )
}

const groupMessagesThresholdMs = 15 * 60 * 1000

type MessageData = Pick<ActivityMessage, '_class' | 'createdBy' | 'createdOn' | 'modifiedOn'>

export function canGroupMessages (message: MessageData, prevMessage?: MessageData): boolean {
  if (prevMessage === undefined) {
    return false
  }

  if (message.createdBy !== prevMessage.createdBy || message._class !== prevMessage._class) {
    return false
  }

  const time1 = message.createdOn ?? message.modifiedOn
  const time2 = prevMessage.createdOn ?? prevMessage.modifiedOn

  if (isOtherHour(time1, time2)) {
    return false
  }

  return time1 - time2 < groupMessagesThresholdMs
}

export function shouldScrollToActivity (): boolean {
  const loc = getCurrentResolvedLocation()
  return getMessageFromLoc(loc) !== undefined
}
