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

import { type Message } from '@hcengineering/communication-types'

export interface MessagesGroup {
  day: number
  messages: Message[]
}

export function getGroupDay (date: Date): number {
  return new Date(date).setHours(0, 0, 0, 0)
}
export function groupMessagesByDay (messages: Message[]): MessagesGroup[] {
  const result: MessagesGroup[] = []

  for (const message of messages) {
    const day = getGroupDay(message.created)
    const group = findOrCreateGroup(result, day, (group) => result.push(group))
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

export function createMessagesObserver (
  contentDiv: HTMLDivElement,
  onMessageView: (node: HTMLDivElement) => void
): () => void {
  const messageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onMessageView(entry.target as HTMLDivElement)
          messageObserver.unobserve(entry.target)
        }
      })
    },
    {
      root: null,
      rootMargin: '-150px 0px -120px 0px',
      threshold: 0.1
    }
  )

  contentDiv.querySelectorAll('.message').forEach((message) => {
    messageObserver.observe(message)
  })

  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node: Node) => {
        const element = node as HTMLDivElement
        if (element.classList?.contains('messages-group')) {
          element.querySelectorAll('.message').forEach((message) => {
            messageObserver.observe(message)
          })
        }
        if (element.classList?.contains('message')) {
          messageObserver.observe(element)
        }
      })
    })
  })

  mutationObserver.observe(contentDiv, { childList: true, subtree: true })

  return () => {
    messageObserver.disconnect()
    mutationObserver.disconnect()
  }
}
