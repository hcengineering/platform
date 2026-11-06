//
// Copyright © 2026 TraceX SAS.
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

import { type PlatformContext } from '@hcengineering/ai-core'
import chunter, {
  type ChatMessage,
  type ChunterSpace,
  type Discussion,
  getDiscussionTitle
} from '@hcengineering/chunter'
import contact, { getName } from '@hcengineering/contact'
import { type AccountUuid, type Class, type Doc, type Ref, type Space } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import { getDocumentTitle, type DocumentReference } from '../shared'
import { markupToText } from '@hcengineering/text-core'
import type { ChatSummary } from './schemas'

type ChatKind = 'channel' | 'direct' | 'discussion'

export interface ChatReference {
  kind: ChatKind
  id: string
}

export interface ResolvedStream {
  target: DocumentReference
  type: ChatKind | 'thread'
  chat: ResolvedChat
  root?: ChatMessage
}

export const CHAT_CLASSES: Record<ChatKind, Ref<Class<Doc>>> = {
  channel: chunter.class.Channel,
  direct: chunter.class.DirectMessage,
  discussion: chunter.class.Discussion
}

export function getChatClasses (ctx: PlatformContext): Array<Ref<Class<Doc>>> {
  const classes = Object.values(CHAT_CLASSES).filter((classId) => ctx.hierarchy.hasClass(classId))
  return [...new Set(classes.flatMap((classId) => [classId, ...ctx.hierarchy.getDescendants(classId)]))]
}

export class ChatToolError extends Error {
  constructor (
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ChatToolError'
  }
}

export interface ResolvedChat {
  ref: ChatReference
  doc: ChunterSpace | Discussion
  spaceId: Ref<Space>
  archived: boolean
  joined: boolean
}

/** Only channels, directs and separate discussions are chats; arbitrary documents are not. */
export function chatReferenceForClass (
  ctx: PlatformContext,
  id: string,
  classId: Ref<Class<Doc>>
): ChatReference | undefined {
  if (!ctx.hierarchy.hasClass(classId)) return undefined
  for (const [kind, baseClass] of Object.entries(CHAT_CLASSES)) {
    if (ctx.hierarchy.isDerived(classId, baseClass)) return { kind: kind as ChatKind, id }
  }
  return undefined
}

export function resolveChat (ctx: PlatformContext, doc: Doc): ResolvedChat | undefined {
  const ref = chatReferenceForClass(ctx, doc._id, doc._class)
  if (ref === undefined) return undefined
  const chatSpace = ref.kind === 'discussion' ? undefined : (doc as ChunterSpace)
  const result: ResolvedChat = {
    ref,
    doc: doc as ChunterSpace | Discussion,
    spaceId: chatSpace?._id ?? doc.space,
    archived: chatSpace?.archived ?? false,
    joined: chatSpace === undefined || chatSpace.members.includes(ctx.token.account)
  }
  return result
}

export async function findChat (ctx: PlatformContext, ref: ChatReference): Promise<ResolvedChat | undefined> {
  const classId = CHAT_CLASSES[ref.kind]
  if (!ctx.hierarchy.hasClass(classId)) return undefined
  const doc = await ctx.client.findOne(classId, { _id: ref.id as Ref<Doc> })
  if (doc === undefined) return undefined
  const chat = resolveChat(ctx, doc)
  return chat?.ref.kind === ref.kind ? chat : undefined
}

async function getDirectName (ctx: PlatformContext, members: AccountUuid[]): Promise<string> {
  const people = await ctx.client.findAll(contact.class.Person, { personUuid: { $in: members } })
  const peopleByAccount = new Map(people.map((person) => [person.personUuid, person]))
  const seenPeople = new Set<string>()
  const names: string[] = []
  let ownName = ''

  // Keep member order and omit self unless this is a chat with oneself, matching buildDmName.
  for (const account of members) {
    const person = peopleByAccount.get(account)
    if (person === undefined || seenPeople.has(person._id)) continue
    seenPeople.add(person._id)
    const name = getName(ctx.hierarchy, person)
    if (account === ctx.token.account) {
      ownName = name
    } else {
      names.push(name)
    }
  }
  return names.length > 0 ? names.join(', ') : ownName
}

async function getDiscussionParentTitle (ctx: PlatformContext, discussion: Discussion): Promise<string | undefined> {
  if (!ctx.hierarchy.hasClass(discussion.attachedToClass)) return undefined
  const owner = await ctx.client.findOne(discussion.attachedToClass, { _id: discussion.attachedTo })
  return owner !== undefined ? await getDocumentTitle(ctx, owner) : undefined
}

export async function summarizeChat (ctx: PlatformContext, chat: ResolvedChat): Promise<ChatSummary> {
  const doc = chat.doc
  let name = doc.name ?? doc._id
  const discussion = chat.ref.kind === 'discussion' ? (doc as Discussion) : undefined
  if (chat.ref.kind === 'direct') {
    name = (await getDirectName(ctx, doc.members)) || doc._id
  } else if (discussion !== undefined) {
    name = getDiscussionTitle(discussion) ?? (await translate(chunter.string.UntitledDiscussion, {}))
  }

  const summary: ChatSummary = {
    target: { class: doc._class, id: doc._id },
    type: chat.ref.kind,
    name,
    spaceId: chat.spaceId,
    members: doc.members,
    resolved: discussion?.resolved,
    parent: discussion !== undefined ? { class: discussion.attachedToClass, id: discussion.attachedTo } : undefined,
    parentTitle: discussion !== undefined ? await getDiscussionParentTitle(ctx, discussion) : undefined,
    linkedTo:
      discussion?.linkedTo !== undefined && discussion.linkedToClass !== undefined
        ? { class: discussion.linkedToClass, id: discussion.linkedTo }
        : undefined
  }
  return summary
}

/** Resolve supported streams through their actual document class and authenticated client. */
export async function findStream (ctx: PlatformContext, target: DocumentReference): Promise<ResolvedStream | undefined> {
  const classId = target.class as Ref<Class<Doc>>
  if (!ctx.hierarchy.hasClass(classId)) return undefined
  const ref = chatReferenceForClass(ctx, target.id, classId)
  if (ref !== undefined) {
    const chat = await findChat(ctx, ref)
    if (chat === undefined || chat.doc._class !== classId) return undefined
    return { target, type: ref.kind, chat }
  }

  if (!ctx.hierarchy.isDerived(classId, chunter.class.ChatMessage)) return undefined
  if (ctx.hierarchy.isDerived(classId, chunter.class.ThreadMessage)) return undefined
  const root = await ctx.client.findOne(chunter.class.ChatMessage, {
    _id: target.id as Ref<ChatMessage>,
    _class: classId
  })
  if (root === undefined) return undefined
  const parent = chatReferenceForClass(ctx, root.attachedTo, root.attachedToClass)
  if (parent === undefined) return undefined
  const chat = await findChat(ctx, parent)
  if (chat === undefined || chat.doc._class !== root.attachedToClass || chat.spaceId !== root.space) return undefined
  return { target, type: 'thread', chat, root }
}

export async function requireStream (ctx: PlatformContext, target: DocumentReference): Promise<ResolvedStream> {
  const stream = await findStream(ctx, target)
  if (stream === undefined) {
    throw new ChatToolError(
      'chat_target_not_found',
      'Stream not found or not accessible. Use a chat document or root chat message, not its owner document or a reply.'
    )
  }
  if (!stream.chat.joined) {
    throw new ChatToolError(
      'chat_membership_required',
      'Join this chat in the application before reading or sending messages.'
    )
  }
  return stream
}

export async function summarizeStream (ctx: PlatformContext, stream: ResolvedStream): Promise<ChatSummary> {
  const summary = await summarizeChat(ctx, stream.chat)
  if (stream.root === undefined) return summary
  return {
    ...summary,
    target: stream.target,
    type: 'thread',
    name: markupToText(stream.root.message).slice(0, 160) || stream.root._id,
    parent: summary.target,
    parentTitle: summary.name
  }
}
