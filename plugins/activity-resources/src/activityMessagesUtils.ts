//
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import core, {
  type AttachedDoc,
  type Attribute,
  type Class,
  type Client,
  type Collection,
  type Doc,
  groupByArray,
  type Hierarchy,
  type Mixin,
  type Ref,
  SortingOrder
} from '@hcengineering/core'
import view, { type AttributeModel } from '@hcengineering/view'
import { getClient, getFiltredKeys } from '@hcengineering/presentation'
import {
  buildRemovedDoc,
  checkIsObjectRemoved,
  getAttributePresenter,
  getDocLinkTitle,
  hasAttributePresenter
} from '@hcengineering/view-resources'
import contact, { type Person } from '@hcengineering/contact'
import { type IntlString } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui'
import { get } from 'svelte/store'
import { personAccountByIdStore } from '@hcengineering/contact-resources'
import activity, {
  type ActivityMessage,
  type DisplayActivityMessage,
  type DisplayDocUpdateMessage,
  type DocAttributeUpdates,
  type DocUpdateMessage
} from '@hcengineering/activity'

// Use 5 minutes to combine similar messages
const combineThresholdMs = 5 * 60 * 1000
// Use 10 seconds to combine update messages after creation.
const createCombineThreshold = parseInt(localStorage.getItem('platform.activity.threshold') ?? '10 * 1000')

const valueTypes: ReadonlyArray<Ref<Class<Doc>>> = [
  core.class.TypeString,
  core.class.EnumOf,
  core.class.TypeNumber,
  core.class.TypeDate,
  core.class.TypeMarkup,
  core.class.TypeHyperlink
]

export async function getAttributeValues (client: Client, values: any[], attrClass: Ref<Class<Doc>>): Promise<any[]> {
  if (values.some((value) => typeof value !== 'string')) {
    return values
  }

  if (valueTypes.includes(attrClass)) {
    return values
  }

  const docs = await client.findAll(attrClass, { _id: { $in: values } })
  const docIds = docs.map(({ _id }) => _id)
  const missedIds = values.filter((value) => !docIds.includes(value))
  const removedDocs = await Promise.all(missedIds.map(async (value) => await buildRemovedDoc(client, value, attrClass)))
  const allDocs = [...docs, ...removedDocs].filter((doc) => !(doc == null))

  if (allDocs.length > 0) {
    return allDocs
  }

  return values
}

export function getCollectionAttribute (
  hierarchy: Hierarchy,
  objectClass: Ref<Class<Doc>>,
  collection?: string
): Attribute<Collection<AttachedDoc>> | undefined {
  if (collection === undefined) {
    return undefined
  }

  const descendants = hierarchy.getDescendants(objectClass)

  for (const descendant of descendants) {
    const collectionAttribute = hierarchy.findAttribute(descendant, collection)
    if (collectionAttribute !== undefined) {
      return collectionAttribute
    }
  }

  return undefined
}

async function getAttributePresenterSafe (
  client: Client,
  _class: Ref<Class<Doc>>,
  attrKey: string,
  mixin?: Ref<Mixin<Doc>>
): Promise<AttributeModel | undefined> {
  try {
    return await getAttributePresenter(client, _class, attrKey, { key: attrKey }, mixin)
  } catch (e) {
    console.error(e)
  }
}

export async function getAttributeModel (
  client: Client,
  attributeUpdates: DocAttributeUpdates | undefined,
  objectClass: Ref<Class<Doc>>
): Promise<AttributeModel | undefined> {
  if (attributeUpdates === undefined) {
    return undefined
  }

  const hierarchy = client.getHierarchy()

  const { attrKey, attrClass, isMixin } = attributeUpdates
  let attrObjectClass = objectClass

  if (isMixin) {
    const keyedAttribute = getFiltredKeys(hierarchy, attrClass, []).find(({ key }) => key === attrKey)
    if (keyedAttribute === undefined) {
      return undefined
    }
    attrObjectClass = keyedAttribute.attr.attributeOf
  }

  const model = await getAttributePresenterSafe(client, attrObjectClass, attrKey, view.mixin.ActivityAttributePresenter)

  if (model !== undefined) {
    return model
  }

  return await getAttributePresenterSafe(client, attrObjectClass, attrKey)
}

export function hasAttributeModel (
  client: Client,
  attributeUpdates: DocAttributeUpdates | undefined,
  objectClass: Ref<Class<Doc>>
): boolean {
  if (attributeUpdates === undefined) {
    return false
  }

  const hierarchy = client.getHierarchy()

  try {
    const { attrKey, attrClass, isMixin } = attributeUpdates
    let attrObjectClass = objectClass
    if (isMixin) {
      const keyedAttribute = getFiltredKeys(hierarchy, attrClass, []).find(({ key }) => key === attrKey)
      if (keyedAttribute === undefined) {
        return false
      }
      attrObjectClass = keyedAttribute.attr.attributeOf
    }

    const hasActivityAttrPresenter = hasAttributePresenter(
      client,
      attrObjectClass,
      attrKey,
      view.mixin.ActivityAttributePresenter
    )

    if (hasActivityAttrPresenter) {
      return true
    }
    return hasAttributePresenter(client, attrObjectClass, attrKey)
  } catch (e) {
    return false
  }
}

export function activityMessagesComparator (message1: ActivityMessage, message2: ActivityMessage): number {
  const time1 = getMessageTime(message1)
  const time2 = getMessageTime(message2)

  return time1 - time2
}

function getMessageTime (message: ActivityMessage): number {
  return message.createdOn ?? message.modifiedOn
}

function combineByCreateThreshold (docUpdateMessages: DocUpdateMessage[]): DocUpdateMessage[] {
  const createMessages = docUpdateMessages.filter(
    ({ action, attachedTo, objectId }) => action === 'create' && attachedTo === objectId
  )
  return docUpdateMessages.filter((message) => {
    const { _id, attachedTo } = message
    const createMsg = createMessages.find((create) => create.attachedTo === attachedTo)

    if (createMsg === undefined) {
      return true
    }

    if (createMsg._id === _id) {
      return true
    }

    const diff = getMessageTime(message) - getMessageTime(createMsg)

    return diff > createCombineThreshold
  })
}

function wrapMessages (
  hierarchy: Hierarchy,
  messages: ActivityMessage[]
): { toCombine: DocUpdateMessage[], uncombined: ActivityMessage[] } {
  const toCombine: DocUpdateMessage[] = []
  const uncombined: ActivityMessage[] = []

  for (const message of messages) {
    if (isDocUpdateMessage(message)) {
      if (hierarchy.isDerived(message.attachedToClass, contact.class.Channel)) {
        uncombined.push(message)
      } else {
        toCombine.push(message)
      }
    } else {
      uncombined.push(message)
    }
  }

  return { toCombine, uncombined }
}

export async function combineActivityMessages (
  messages: ActivityMessage[],
  sortingOrder: SortingOrder = SortingOrder.Ascending
): Promise<DisplayActivityMessage[]> {
  const client = getClient()

  const { uncombined, toCombine } = wrapMessages(client.getHierarchy(), messages)
  const docUpdateMessages = combineByCreateThreshold(toCombine)

  if (docUpdateMessages.length === 0) {
    return sortActivityMessages(uncombined, sortingOrder)
  }

  const result: Array<DisplayActivityMessage | undefined> = [...uncombined]

  const groupedByType: Map<string, DocUpdateMessage[]> = groupByArray(docUpdateMessages, getDocUpdateMessageKey)

  for (const [, groupedMessages] of groupedByType) {
    const cantMerge = groupedMessages.filter(
      (message, index) => index !== groupedMessages.length - 1 && !canCombineMessage(message)
    )
    const cantMergeIds = new Set(cantMerge.map(({ _id }) => _id))

    const canMerge = groupedMessages.filter(({ _id }) => !cantMergeIds.has(_id))
    const forMerge = groupByTime(canMerge)

    forMerge.forEach((messagesForMerge) => {
      const mergedNotification = mergeDocUpdateMessages(messagesForMerge)

      if (mergedNotification !== undefined) {
        result.push(mergedNotification)
      }
    })
    result.push(...cantMerge)
  }

  const viewlets = client.getModel().findAllSync(activity.class.DocUpdateMessageViewlet, {})

  for (const [index, message] of result.entries()) {
    if (message?._class !== activity.class.DocUpdateMessage) {
      continue
    }
    const docUpdateMessage = message as DocUpdateMessage

    if (
      docUpdateMessage.action === 'update' &&
      !hasAttributeModel(client, docUpdateMessage.attributeUpdates, docUpdateMessage.objectClass)
    ) {
      result[index] = undefined
      continue
    }

    const hideIfRemoved = viewlets.some(
      (viewlet) =>
        viewlet.action === docUpdateMessage.action &&
        viewlet.hideIfRemoved === true &&
        viewlet.objectClass === docUpdateMessage.objectClass
    )

    if (!hideIfRemoved) {
      continue
    }

    const isRemoved = await checkIsObjectRemoved(client, docUpdateMessage.objectId, docUpdateMessage.objectClass)

    if (isRemoved) {
      result[index] = undefined
    }
  }

  return sortActivityMessages(
    result.filter((msg): msg is DisplayActivityMessage => msg !== undefined),
    sortingOrder
  )
}

export function sortActivityMessages<T extends ActivityMessage> (
  messages: T[],
  order: SortingOrder = SortingOrder.Ascending
): T[] {
  return messages.sort((message1, message2) =>
    order === SortingOrder.Ascending
      ? activityMessagesComparator(message1, message2)
      : activityMessagesComparator(message2, message1)
  )
}

function canCombineMessage (message: ActivityMessage): boolean {
  const hasReactions = message.reactions !== undefined && message.reactions > 0
  const isPinned = message.isPinned === true
  const hasReplies = message.replies !== undefined && message.replies > 0

  return !hasReactions && !isPinned && !hasReplies
}

function groupByTime<T extends ActivityMessage> (messages: T[]): T[][] {
  const result: T[][] = []

  for (const message1 of messages) {
    if (result.some((forMerge) => forMerge.includes(message1))) {
      continue
    }

    const forMerge: T[] = [message1]

    for (const message2 of messages) {
      if (message1._id === message2._id) {
        continue
      }

      const timeDiff = (message2.createdOn ?? message2.modifiedOn) - (message1.createdOn ?? message1.modifiedOn)

      if (timeDiff >= 0 && timeDiff < combineThresholdMs) {
        forMerge.push(message2)
      }
    }

    result.push(forMerge)
  }

  return result
}

function getDocUpdateMessageKey (message: DocUpdateMessage): string {
  const personAccountById = get(personAccountByIdStore)
  const person = personAccountById.get(message.createdBy as any)?.person ?? message.createdBy

  if (message.action === 'update') {
    return [message._class, message.attachedTo, message.action, person, getAttributeUpdatesKey(message)].join('_')
  }

  return [
    message._class,
    message.attachedTo,
    person,
    message.updateCollection,
    message.objectId === message.attachedTo
  ].join('_')
}

function mergeDocUpdateAttributes (messages: DocUpdateMessage[]): DisplayDocUpdateMessage | undefined {
  const firstMessage = messages[0]
  const lastMessage = messages[messages.length - 1]

  let mergedAttributeUpdates = firstMessage.attributeUpdates

  messages.forEach((message) => {
    if (message._id !== firstMessage._id && message.attributeUpdates !== undefined) {
      mergedAttributeUpdates = mergeAttributeUpdates(message.attributeUpdates, mergedAttributeUpdates)
    }
  })

  if (mergedAttributeUpdates === undefined) {
    return undefined
  }

  const hasChanges =
    mergedAttributeUpdates.set.length > 0 ||
    mergedAttributeUpdates.added.length > 0 ||
    mergedAttributeUpdates.removed.length > 0

  if (!hasChanges) {
    return undefined
  }

  return {
    ...lastMessage,
    attributeUpdates: mergedAttributeUpdates,
    combinedMessagesIds: messages.map(({ _id }) => _id)
  }
}

function mergeDocUpdateMessages (messages: DocUpdateMessage[]): DisplayDocUpdateMessage | undefined {
  if (messages.length === 0) {
    return undefined
  }

  if (messages[0].action === 'update') {
    return mergeDocUpdateAttributes(messages)
  }

  if (messages.length === 1) {
    return messages[0]
  }

  const removeMessages = messages.filter(({ action }) => action === 'remove')
  const createMessages = messages.filter(({ action }) => action === 'create')
  const removedObjectIds = removeMessages.map(({ objectId }) => objectId)
  const createdObjectIds = createMessages.map(({ objectId }) => objectId)

  const forMerge = [
    ...createMessages.filter(({ objectId }) => !removedObjectIds.includes(objectId)),
    ...removeMessages.filter(({ objectId }) => !createdObjectIds.includes(objectId))
  ]

  forMerge.sort(activityMessagesComparator)

  if (forMerge.length === 0) {
    return undefined
  }

  return {
    ...forMerge[forMerge.length - 1],
    previousMessages: forMerge.slice(0, -1),
    combinedMessagesIds: messages.map(({ _id }) => _id)
  }
}

function mergeAttributeUpdates (
  attributeUpdates: DocAttributeUpdates,
  prevAttributeUpdates?: DocAttributeUpdates
): DocAttributeUpdates {
  if (prevAttributeUpdates === undefined) {
    return attributeUpdates
  }

  if (attributeUpdates.attrKey !== prevAttributeUpdates.attrKey) {
    return attributeUpdates
  }

  const added = attributeUpdates.added
    .filter((item) => !prevAttributeUpdates.removed.includes(item))
    .concat(prevAttributeUpdates.added.filter((item) => !attributeUpdates.removed.includes(item)))
  const removed = attributeUpdates.removed
    .filter((item) => !prevAttributeUpdates.added.includes(item))
    .concat(prevAttributeUpdates.removed.filter((item) => !attributeUpdates.added.includes(item)))

  const { prevValue } = prevAttributeUpdates
  const { set, attrClass, attrKey, isMixin } = attributeUpdates

  return {
    attrKey,
    attrClass,
    prevValue,
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    set: prevValue ? set.filter((value) => value !== prevValue) : set,
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    added: prevValue ? added.filter((value) => value !== prevValue) : added,
    removed,
    isMixin
  }
}

function getAttributeUpdatesKey (message: DocUpdateMessage): string {
  if (message.attributeUpdates === undefined) {
    return ''
  }

  const { attrKey, attrClass, isMixin } = message.attributeUpdates

  return [attrKey, attrClass, isMixin].join('-')
}

export function referencesFilter (message: ActivityMessage, _class?: Ref<Doc>): boolean {
  return message._class === activity.class.ActivityReference
}

export function attributesFilter (message: ActivityMessage, _class?: Ref<Doc>): boolean {
  if (message._class === activity.class.DocUpdateMessage) {
    return (message as DocUpdateMessage).objectClass === _class
  }

  return false
}

export function pinnedFilter (message: ActivityMessage, _class?: Ref<Doc>): boolean {
  return message.isPinned === true
}

export function allFilter (): boolean {
  return true
}

export interface LinkData {
  title?: string
  preposition: IntlString
  panelComponent: AnyComponent
  object: Doc
}

export async function getLinkData (
  message: DisplayActivityMessage,
  object: Doc | undefined,
  parentObject: Doc | undefined,
  person: Person | undefined
): Promise<LinkData | undefined> {
  const client = getClient()
  const hierarchy = client.getHierarchy()

  let linkObject: Doc | undefined

  if (hierarchy.isDerived(message.attachedToClass, activity.class.ActivityMessage)) {
    linkObject = parentObject
  } else if (message._class === activity.class.DocUpdateMessage) {
    linkObject = (message as DocUpdateMessage).action === 'update' ? object : parentObject ?? object
  } else {
    linkObject = parentObject ?? object
  }

  if (linkObject === undefined) {
    return undefined
  }

  if (person !== undefined && person._id === linkObject._id) {
    return undefined
  }

  const title = await getDocLinkTitle(client, linkObject._id, linkObject._class, linkObject)

  const preposition = hierarchy.classHierarchyMixin(linkObject._class, activity.mixin.ActivityDoc)?.preposition
  const panelComponent = hierarchy.classHierarchyMixin(linkObject._class, view.mixin.ObjectPanel)

  return {
    title,
    preposition: preposition ?? activity.string.In,
    panelComponent: panelComponent?.component ?? view.component.EditDoc,
    object: linkObject
  }
}

function isDocUpdateMessage (message?: ActivityMessage): message is DocUpdateMessage {
  if (message === undefined) {
    return false
  }

  return message._class === activity.class.DocUpdateMessage
}

export function isActivityMessage (message?: Doc): message is ActivityMessage {
  if (message === undefined) {
    return false
  }

  return getClient().getHierarchy().isDerived(message._class, activity.class.ActivityMessage)
}

export function isReactionMessage (message?: ActivityMessage): boolean {
  if (message === undefined) {
    return false
  }

  if (!isDocUpdateMessage(message)) {
    return false
  }

  return message.objectClass === activity.class.Reaction
}

export function isActivityMessageClass (_class?: Ref<Class<Doc>>): boolean {
  if (_class === undefined) {
    return false
  }

  return getClient().getHierarchy().isDerived(_class, activity.class.ActivityMessage)
}
