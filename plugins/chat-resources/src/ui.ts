//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { type Message, type Reaction } from '@hcengineering/communication-types'
import { getCurrentEmployee, type Person } from '@hcengineering/contact'
import { type PersonId } from '@hcengineering/core'
import { jsonToMarkup } from '@hcengineering/text'
import { markdownToMarkup } from '@hcengineering/text-markdown'
import { type MessageType, type ReactionType } from '@hcengineering/ui-next'

export interface MessagesGroup {
  day: number
  messages: Message[]
}

export function groupMessagesByDay (messages: Message[]): MessagesGroup[] {
  const result: MessagesGroup[] = []

  for (const message of messages) {
    const dayTimestamp = new Date(message.created).setHours(0, 0, 0, 0)
    const group = findOrCreateGroup(result, dayTimestamp, (group) => result.push(group))
    group.messages.push(message)
  }

  return result
}

function findOrCreateGroup (
  groups: MessagesGroup[],
  dayTimestamp: number,
  pushFn: (group: MessagesGroup) => void
): MessagesGroup {
  let group = groups.find((g) => g.day === dayTimestamp)

  if (group === undefined) {
    group = { day: dayTimestamp, messages: [] }
    pushFn(group)
  }

  return group
}

export function toDisplayMessages (message: Message[], personByPersonId: Map<PersonId, Person>): MessageType[] {
  return message.map((message) => toDisplayMessage(message, personByPersonId))
}

export function toDisplayMessage (message: Message, personByPersonId: Map<PersonId, Person>): MessageType {
  // TODO: remove it
  const person = personByPersonId.get(message.creator)
  return {
    id: message.id,
    text: jsonToMarkup(markdownToMarkup(message.content)),
    authorName: person?.name ?? '',
    author: person?._id,
    avatar: person,
    date: message.created,
    edited: message.edited,
    reactions: toDisplayReactions(message.reactions, personByPersonId),
    repliesCount: message.thread?.repliesCount,
    lastReplyDate: message.thread?.lastReply
  }
}
function toDisplayReactions (reactions: Reaction[], personByPersonId: Map<PersonId, Person>): ReactionType[] {
  const result: ReactionType[] = []
  const me = getCurrentEmployee()

  for (const reaction of reactions) {
    const person = personByPersonId.get(reaction.creator)
    const current = result.find((it) => it.emoji === reaction.reaction)
    if (current !== undefined) {
      current.count++
      current.selected = current.selected === true || person?._id === me
      if (person != null && !current.persons.includes(person._id)) {
        current.persons.push(person._id)
      }
    } else {
      result.push({
        id: reaction.reaction,
        emoji: reaction.reaction,
        selected: person?._id === me,
        persons: person != null ? [person._id] : [],
        count: 1
      })
    }
  }
  return result
}

// export function createMessagesObserver (contentDiv: HTMLDivElement, onMessageView: (node: HTMLDivElement) => void): void {
//   const messageObserver = new IntersectionObserver((entries) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         onMessageView(entry.target as HTMLDivElement)
//         messageObserver.unobserve(entry.target)
//       }
//     })
//   }, {
//     root: null,
//     rootMargin: '0px',
//     threshold: 0.1
//   })
//
//   contentDiv.querySelectorAll('.message').forEach(message => {
//     messageObserver.observe(message)
//   })
//
//   const mutationObserver = new MutationObserver((mutations) => {
//     mutations.forEach(mutation => {
//       mutation.addedNodes.forEach((node: Node) => {
//         const element = node as HTMLDivElement
//         if (element.classList?.contains('messages-group')) {
//           element.querySelectorAll('.message').forEach(message => {
//             messageObserver.observe(message)
//           })
//         }
//         if (element.classList?.contains('message') && !element.classList.contains('read')) {
//           messageObserver.observe(element)
//         }
//       })
//     })
//   })
//
//   mutationObserver.observe(contentDiv, { childList: true, subtree: true })
// }
