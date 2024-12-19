//
// Copyright © 2024 Hardcore Engineering Inc.
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

import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import { type Document } from './document'

export enum MessageType {
  Sync = 0,
  Awareness = 1
}

export function forceSyncMessage (doc: Document): encoding.Encoder {
  const encoder = encoding.createEncoder()

  encoding.writeVarUint(encoder, MessageType.Sync)
  syncProtocol.writeSyncStep1(encoder, doc)

  return encoder
}

export function updateMessage (update: Uint8Array, origin: any): encoding.Encoder {
  const encoder = encoding.createEncoder()

  encoding.writeVarUint(encoder, MessageType.Sync)
  syncProtocol.writeUpdate(encoder, update)

  return encoder
}

export function awarenessMessage (doc: Document, clients: Array<number>): encoding.Encoder {
  const encoder = encoding.createEncoder()

  encoding.writeVarUint(encoder, MessageType.Awareness)
  encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, clients))

  return encoder
}

export function handleMessage (doc: Document, message: Uint8Array, origin: any): encoding.Encoder {
  const encoder = encoding.createEncoder()
  const decoder = decoding.createDecoder(message)
  const messageType = decoding.readVarUint(decoder)

  switch (messageType) {
    case MessageType.Sync:
      encoding.writeVarUint(encoder, MessageType.Sync)
      syncProtocol.readSyncMessage(decoder, encoder, doc, origin)
      break

    case MessageType.Awareness:
      awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), origin)
      break

    default:
      throw new Error('Unknown message type')
  }
  return encoder
}
