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

import type { LinkPreviewID, MessageID } from '@hcengineering/communication-types'

const COUNTER_BITS = 10n
const RANDOM_BITS = 10n
const MAX_SEQUENCE = (1n << COUNTER_BITS) - 1n

let counter = 0n

function makeBigIntId (): bigint {
  const ts = BigInt(Date.now())
  counter = counter < MAX_SEQUENCE ? counter + 1n : 0n
  const random = BigInt(Math.floor(Math.random() * Number((1n << RANDOM_BITS) - 1n)))
  return (ts << (COUNTER_BITS + RANDOM_BITS)) | (counter << RANDOM_BITS) | random
}

function toBase64Url (bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  const base64 = typeof btoa === 'function' ? btoa(s) : Buffer.from(bytes).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateMessageId (): MessageID {
  const idBig = makeBigIntId()
  const buf = new Uint8Array(8)
  new DataView(buf.buffer).setBigUint64(0, idBig, false)
  return toBase64Url(buf) as MessageID
}

export function generateLinkPreviewId (): LinkPreviewID {
  return makeBigIntId().toString() as LinkPreviewID
}
