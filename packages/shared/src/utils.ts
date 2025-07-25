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

import {
  MessageID,
  AppletAttachment,
  Attachment,
  BlobAttachment,
  LinkPreviewAttachment,
  linkPreviewType,
  WithTotal
} from '@hcengineering/communication-types'

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

export function isAppletAttachment (attachment: Attachment): attachment is AppletAttachment {
  return attachment.type.startsWith('application/vnd.huly.applet.')
}

export function isLinkPreviewAttachmentType (type: string): boolean {
  return type === linkPreviewType
}

export function isAppletAttachmentType (type: string): boolean {
  return type.startsWith('application/vnd.huly.applet.')
}

export function isBlobAttachmentType (type: string): boolean {
  return !isLinkPreviewAttachmentType(type) && !isAppletAttachmentType(type)
}

export function isLinkPreviewAttachment (attachment: Attachment): attachment is LinkPreviewAttachment {
  return attachment.type === linkPreviewType
}

export function isBlobAttachment (attachment: Attachment): attachment is BlobAttachment {
  return !isLinkPreviewAttachment(attachment) && !isAppletAttachment(attachment) && 'blobId' in attachment.params
}

export function withTotal<T> (objects: T[], total?: number): WithTotal<T> {
  const length = total ?? objects.length

  return Object.assign(objects, { total: length })
}
