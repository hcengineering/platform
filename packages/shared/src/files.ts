import type {
  FileMessage,
  FileMetadata,
  MessagesGroup,
  ParsedFile,
  WorkspaceID
} from '@hcengineering/communication-types'
import yaml from 'js-yaml'

import { retry, type RetryOptions } from './retry'

export async function loadGroupFile(
  workspace: WorkspaceID,
  filesUrl: string,
  group: MessagesGroup,
  options: RetryOptions
): Promise<ParsedFile> {
  const url = getFileUrl(workspace, filesUrl, group.blobId)

  const file = await retry(() => fetchFile(url), options)
  const [metadata, messages] = yaml.loadAll(file) as [FileMetadata, FileMessage[]]

  return {
    metadata,
    messages: messages.map((message) => ({
      id: message.id,
      card: metadata.card,
      content: message.content,
      edited: message.edited,
      creator: message.creator,
      created: message.created,
      attachments: [],
      reactions: message.reactions.map((reaction) => ({
        message: message.id,
        reaction: reaction.reaction,
        creator: reaction.creator,
        created: reaction.created
      }))
    }))
  }
}

async function fetchFile(url: string): Promise<string> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Failed to fetch file: ${res.statusText}`)
  }

  return await res.text()
}

function getFileUrl(workspace: WorkspaceID, urlTemplate: string, file: string): string {
  return urlTemplate
    .replaceAll(':filename', encodeURIComponent(file))
    .replaceAll(':workspace', encodeURIComponent(workspace))
    .replaceAll(':blobId', encodeURIComponent(file))
}
