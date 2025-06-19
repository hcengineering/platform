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

import core, { type Blob, type Doc, type MeasureContext, type TxCUD, type TxCreateDoc } from '@hcengineering/core'
import { PlatformQueueProducer } from '@hcengineering/server-core'
import { VideoTranscodeRequest, VideoTranscodeResult } from './types'

export async function handleTx (
  ctx: MeasureContext,
  workspaceUuid: string,
  tx: TxCUD<Doc>,
  producer: PlatformQueueProducer<VideoTranscodeRequest>
): Promise<void> {
  if (tx.objectClass !== core.class.Blob) return
  if (tx._class !== core.class.TxCreateDoc) return

  const createTx = tx as TxCreateDoc<Blob>
  if (createTx.attributes.contentType.startsWith('video/')) {
    const msg: VideoTranscodeRequest = {
      workspaceUuid,
      blobId: createTx.objectId,
      contentType: createTx.attributes.contentType
    }

    ctx.info('Transcode request', { msg })
    await producer.send(createTx.objectId, [msg])
  }
}

export async function handleTranscodeResult (ctx: MeasureContext, msg: VideoTranscodeResult): Promise<void> {
  // TODO Handle transcode result
  ctx.info('Transcode result', { msg })
}
