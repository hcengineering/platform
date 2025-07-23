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

import { retry, type RetryOptions } from '@hcengineering/communication-shared'
import {
  type Attachment,
  type BlobID,
  type FileMessage,
  type FileMetadata,
  type ParsedFile,
  type WorkspaceID,
  linkPreviewType
} from '@hcengineering/communication-types'
import yaml from 'js-yaml'

export async function loadGroupFile (
  workspace: WorkspaceID,
  filesUrl: string,
  blobId: BlobID,
  options: RetryOptions
): Promise<ParsedFile> {
  const url = getFileUrl(workspace, filesUrl, blobId)

  const file = await retry(() => fetchFile(url), options)
  return parseYaml(file)
}

async function fetchFile (url: string): Promise<string> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Failed to fetch file: ${res.statusText}`)
  }

  if (res.body == null) {
    throw new Error('Missing response body')
  }

  return await res.text()
}

function getFileUrl (workspace: WorkspaceID, urlTemplate: string, file: string): string {
  return urlTemplate
    .replaceAll(':filename', encodeURIComponent(file))
    .replaceAll(':workspace', encodeURIComponent(workspace))
    .replaceAll(':blobId', encodeURIComponent(file))
}

export function parseYaml (data: string): ParsedFile {
  const [metadata, messages] = yaml.loadAll(data) as [FileMetadata, FileMessage[]]

  return {
    ...metadata,
    messages: messages.map((message) => ({
      id: message.id,
      type: message.type,
      cardId: metadata.cardId ?? (metadata as any).card,
      content: message.content,
      edited: message.edited,
      creator: message.creator,
      created: message.created,
      removed: message.removed,
      extra: message.extra ?? (message as any).data,
      thread:
        message.thread != null
          ? {
              cardId: metadata.cardId,
              messageId: message.id,
              threadId: message.thread.threadId ?? (message.thread as any).thread,
              threadType: message.thread.threadType,
              repliesCount: message.thread.repliesCount,
              lastReply: message.thread.lastReply
            }
          : undefined,
      attachments: parseAttachments(message),
      reactions: message.reactions ?? []
    }))
  }
}

function parseAttachments (message: FileMessage): Attachment[] {
  if (message.attachments != null) {
    return message.attachments
  }

  const oldMessage = message as any

  const attachments: Attachment[] = []

  if ('files' in oldMessage && Array.isArray(oldMessage.files)) {
    attachments.push(
      ...oldMessage.files.map((it: any) => ({
        id: it.blobId,
        type: it.type,
        params: {
          blobId: it.blobId,
          mimeType: it.type,
          fileName: it.filename,
          size: it.size,
          metadata: it.meta
        },
        creator: it.creator,
        created: new Date(it.created)
      }))
    )
  } else if ('blobs' in oldMessage && Array.isArray(oldMessage.blobs)) {
    attachments.push(
      ...oldMessage.blobs.map((it: any) => ({
        id: it.blobId,
        type: it.mimeType ?? it.contentType,
        params: {
          blobId: it.blobId,
          mimeType: it.mimeType ?? it.contentType,
          fileName: it.fileName,
          size: it.size,
          metadata: it.metadata
        },
        creator: it.creator,
        created: new Date(it.created)
      }))
    )
  }

  if ('linkPreviews' in oldMessage && Array.isArray(oldMessage.linkPreviews)) {
    attachments.push(
      ...oldMessage.linkPreviews.map((it: any) => ({
        id: it.previewId,
        type: linkPreviewType,
        params: it,
        creator: it.creator,
        created: new Date(it.created)
      }))
    )
  }

  return attachments
}
