//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License. You may
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

const COUNTER_BITS = 12n
const RANDOM_BITS = 10n
const MAX_SEQUENCE = (1n << COUNTER_BITS) - 1n
const MAX_RANDOM = (1n << RANDOM_BITS) - 1n

let counter = 0n

/**
 * Generate 64-bit MessageID and return it as string.
 */
export function generateMessageId(): MessageID {
  const ts = BigInt(Date.now())
  counter = counter < MAX_SEQUENCE ? counter + 1n : 0n

  const random = BigInt(Math.floor(Math.random() * Number(MAX_RANDOM + 1n)))

  const id = (ts << (COUNTER_BITS + RANDOM_BITS)) | (counter << RANDOM_BITS) | random

  return id.toString() as MessageID
}
