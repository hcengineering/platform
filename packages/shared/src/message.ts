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

import type { MessageID } from '@hcengineering/communication-types'

let lastTimestamp = 0
let counter = 0n

export function generateMessageId(): MessageID {
  const timestamp = Math.floor(Date.now() / 1000)

  if (timestamp !== lastTimestamp) {
    lastTimestamp = timestamp
    counter = 0n
  }

  const id = (BigInt(timestamp) << 20n) | counter
  counter++

  return id.toString() as MessageID
}

export function parseMessageId(messageId: MessageID): Date {
  const timestamp = Number(BigInt(messageId) >> 20n)

  return new Date(timestamp * 1000)
}
