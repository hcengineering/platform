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

import { type Blob, type CollaborativeDoc, type Ref, generateId } from '@hcengineering/core'
import { encodeDocumentId } from '@hcengineering/collaborator-client'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import textEditor from '@hcengineering/text-editor'
import { Doc as Ydoc } from 'yjs'

import { CloudCollabProvider } from './cloud'
import { HocuspocusCollabProvider } from './hocuspocus'
import { IndexeddbProvider } from './indexeddb'
import { type Provider } from './types'

function getDocumentId (doc: CollaborativeDoc): string {
  const workspace = getMetadata(presentation.metadata.WorkspaceId) ?? ''
  return encodeDocumentId(workspace, doc)
}

export function createLocalProvider (ydoc: Ydoc, doc: CollaborativeDoc): Provider {
  const documentId = getDocumentId(doc)
  return new IndexeddbProvider(documentId, ydoc)
}

export function createRemoteProvider (ydoc: Ydoc, doc: CollaborativeDoc, content: Ref<Blob> | null): Provider {
  const collaborator = getMetadata(textEditor.metadata.Collaborator)

  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorUrl = getMetadata(presentation.metadata.CollaboratorUrl) ?? ''

  const documentId = getDocumentId(doc)

  return collaborator === 'cloud'
    ? new CloudCollabProvider({
      url: collaboratorUrl,
      name: documentId,
      document: ydoc,
      content,
      token
    })
    : new HocuspocusCollabProvider({
      url: collaboratorUrl,
      name: documentId,
      document: ydoc,
      token,
      parameters: { content }
    })
}

export const createTiptapCollaborationData = (
  doc: CollaborativeDoc,
  content: Ref<Blob> | null
): { provider: Provider, ydoc: Ydoc } => {
  const ydoc: Ydoc = new Ydoc({ guid: generateId() })
  return {
    ydoc,
    provider: createRemoteProvider(ydoc, doc, content)
  }
}
