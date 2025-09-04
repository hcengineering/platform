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

import attachment, { type Attachment } from '@hcengineering/attachment'
import { Event, MessageEventType } from '@hcengineering/communication-sdk-types'
import { BlobAttachment } from '@hcengineering/communication-types'
import drive, { type FileVersion } from '@hcengineering/drive'
import core, {
  type Blob,
  type Doc,
  type MeasureContext,
  type Ref,
  type Tx,
  type TxCreateDoc,
  type TxDomainEvent,
  type WorkspaceUuid,
  OperationDomain
} from '@hcengineering/core'
import { PlatformQueueProducer } from '@hcengineering/server-core'
import { BlobSource, BlobSourceType, VideoTranscodeRequest, VideoTranscodeResult } from './types'
import { WorkspaceClient } from './client'

const COMMUNICATION = 'communication' as OperationDomain

const transcodeIgnoredContentTypes = [
  'video/x-mpegurl', // HLS playlist
  'video/mp2t' // MPEG-2 Transport Stream
]

function shouldTranscode (contentType: string): boolean {
  return contentType.startsWith('video/') && !transcodeIgnoredContentTypes.includes(contentType)
}

export async function handleTx (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  tx: Tx,
  producer: PlatformQueueProducer<VideoTranscodeRequest>
): Promise<void> {
  if (tx._class === core.class.TxCreateDoc) {
    await handleCreateDocTx(ctx, workspaceUuid, tx as TxCreateDoc<Doc>, producer)
  } else if (tx._class === core.class.TxDomainEvent) {
    await handleCommunicationTx(ctx, workspaceUuid, tx as TxDomainEvent<Event>, producer)
  }
}

async function handleCreateDocTx (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  tx: TxCreateDoc<Doc>,
  producer: PlatformQueueProducer<VideoTranscodeRequest>
): Promise<void> {
  let blobId: Ref<Blob>
  let contentType: string

  if (tx.objectClass === attachment.class.Attachment || tx.objectClass === attachment.class.Embedding) {
    const createTx = tx as TxCreateDoc<Attachment>
    blobId = createTx.attributes.file
    contentType = createTx.attributes.type
  } else if (tx.objectClass === drive.class.FileVersion) {
    const createTx = tx as TxCreateDoc<FileVersion>
    blobId = createTx.attributes.file
    contentType = createTx.attributes.type
  } else {
    return
  }

  if (shouldTranscode(contentType)) {
    const source: BlobSource = {
      source: BlobSourceType.Doc,
      objectClass: tx.objectClass,
      objectId: tx.objectId
    }
    const msg: VideoTranscodeRequest = { workspaceUuid, blobId, contentType, source }
    ctx.info('transcode request', { workspaceUuid, msg })
    await producer.send(ctx, workspaceUuid, [msg])
  }
}

async function handleCommunicationTx (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  tx: TxDomainEvent<Event>,
  producer: PlatformQueueProducer<VideoTranscodeRequest>
): Promise<void> {
  if (tx.domain === COMMUNICATION && tx.event.type === MessageEventType.AttachmentPatch) {
    const event = tx.event
    const source: BlobSource = {
      source: BlobSourceType.Message,
      cardId: event.cardId,
      messageId: event.messageId
    }

    const attachments = event.operations
      .filter((it) => it.opcode === 'add' || it.opcode === 'set')
      .flatMap((it) => it.attachments)
      .filter((it): it is BlobAttachment => 'blobId' in it.params)

    const messages: VideoTranscodeRequest[] = attachments.map(({ params }) => ({
      workspaceUuid,
      blobId: params.blobId,
      contentType: params.mimeType,
      source
    }))

    if (messages.length > 0) {
      await producer.send(ctx, workspaceUuid, messages)
    }
  }
}

export async function handleTranscodeResult (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  msg: VideoTranscodeResult
): Promise<void> {
  ctx.info('transcode result', { workspaceUuid, msg })
  const metadata = {
    hls: {
      source: msg.playlist,
      thumbnail: msg.thumbnail
    }
  }

  const client = await WorkspaceClient.create(workspaceUuid)

  if (msg.source !== undefined && msg.source.source === BlobSourceType.Doc) {
    await client.updateBlobMetadata(ctx, msg, metadata)
  } else if (msg.source !== undefined && msg.source.source === BlobSourceType.Message) {
    await client.updateCommMetadata(ctx, msg, metadata)
  }
}
