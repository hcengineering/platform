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

import { Readable } from 'stream'
import { FileMessage, Message, ParsedFile } from '@hcengineering/communication-types'
import { parseYaml } from '@hcengineering/communication-shared'

export async function parseFileStream (stream: Readable): Promise<ParsedFile> {
  return await new Promise((resolve, reject) => {
    let yamlData = ''

    stream.on('data', (chunk) => {
      yamlData += chunk.toString()
    })

    stream.on('end', () => {
      try {
        resolve(parseYaml(yamlData))
      } catch (error) {
        reject(error)
      }
    })

    stream.on('error', (error) => {
      reject(error)
    })
  })
}

export function toFileMessage (message: Message): FileMessage {
  return {
    id: message.id,
    content: message.content,
    edited: message.edited,
    creator: message.creator,
    created: message.created,
    thread:
      message.thread != null
        ? {
            thread: message.thread.thread,
            repliesCount: message.thread.repliesCount,
            lastReply: message.thread.lastReply
          }
        : undefined,
    reactions: message.reactions.map((reaction) => ({
      reaction: reaction.reaction,
      creator: reaction.creator,
      created: reaction.created
    }))
  }
}
