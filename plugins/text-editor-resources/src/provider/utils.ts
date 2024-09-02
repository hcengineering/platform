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

import { type Ref, type CollaborativeDoc, type Doc, type Class } from '@hcengineering/core'
import {
  type DocumentId,
  type PlatformDocumentId,
  formatDocumentId,
  formatPlatformDocumentId as origFormatPlatformDocumentId
} from '@hcengineering/collaborator-client'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import textEditor from '@hcengineering/text-editor'
import { Doc as Ydoc } from 'yjs'

import { CloudCollabProvider } from './cloud'
import { HocuspocusCollabProvider } from './hocuspocus'
import { IndexeddbProvider } from './indexeddb'
import { type Provider } from './types'

export function formatCollaborativeDocumentId (collaborativeDoc: CollaborativeDoc): DocumentId {
  const workspace = getMetadata(presentation.metadata.WorkspaceId) ?? ''
  return formatDocumentId(workspace, collaborativeDoc)
}

export function formatPlatformDocumentId (
  objectClass: Ref<Class<Doc>>,
  objectId: Ref<Doc>,
  objectAttr: string
): PlatformDocumentId {
  return origFormatPlatformDocumentId(objectClass, objectId, objectAttr)
}

export function createLocalProvider (ydoc: Ydoc, document: CollaborativeDoc): Provider {
  const documentId = formatCollaborativeDocumentId(document)
  return new IndexeddbProvider(documentId, ydoc)
}

export function createRemoteProvider (
  ydoc: Ydoc,
  params: {
    document: CollaborativeDoc
    initialDocument?: CollaborativeDoc
    objectClass?: Ref<Class<Doc>>
    objectId?: Ref<Doc>
    objectAttr?: string
  }
): Provider {
  const collaborator = getMetadata(textEditor.metadata.Collaborator)

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorUrl = getMetadata(presentation.metadata.CollaboratorUrl) ?? ''

  const documentId = formatCollaborativeDocumentId(params.document)
  const initialContentId =
    params.initialDocument !== undefined ? formatCollaborativeDocumentId(params.initialDocument) : undefined

  const { objectClass, objectId, objectAttr } = params
  const platformDocumentId =
    objectClass !== undefined && objectId !== undefined && objectAttr !== undefined
      ? formatPlatformDocumentId(objectClass, objectId, objectAttr)
      : undefined

  return collaborator === 'cloud'
    ? new CloudCollabProvider({
      url: collaboratorUrl,
      name: documentId,
      document: ydoc,
      token
    })
    : new HocuspocusCollabProvider({
      url: collaboratorUrl,
      name: documentId,
      document: ydoc,
      token,
      parameters: {
        initialContentId,
        platformDocumentId
      }
    })
}

export const createTiptapCollaborationData = (params: {
  document: CollaborativeDoc
  initialDocument?: CollaborativeDoc
  objectClass?: Ref<Class<Doc>>
  objectId?: Ref<Doc>
  objectAttr?: string
}): { provider: Provider, ydoc: Ydoc } => {
  const ydoc: Ydoc = new Ydoc()
  return {
    ydoc,
    provider: createRemoteProvider(ydoc, params)
  }
}
