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
import { OK, Severity, Status, getMetadata, setPlatformStatus } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { Doc as Ydoc } from 'yjs'

import plugin from '../plugin'

import { HocuspocusCollabProvider } from './hocuspocus'
import { IndexeddbProvider } from './indexeddb'
import { type Provider } from './types'

function getDocumentId (doc: CollaborativeDoc): string {
  const workspace = getMetadata(presentation.metadata.WorkspaceUuid) ?? ''
  return encodeDocumentId(workspace, doc)
}

export function createLocalProvider (ydoc: Ydoc, doc: CollaborativeDoc): Provider {
  const documentId = getDocumentId(doc)
  return new IndexeddbProvider(documentId, ydoc)
}

export function createRemoteProvider (ydoc: Ydoc, doc: CollaborativeDoc, content: Ref<Blob> | null): Provider {
  const token = getMetadata(presentation.metadata.Token) ?? ''
  const collaboratorUrl = getMetadata(presentation.metadata.CollaboratorUrl) ?? ''

  const documentId = getDocumentId(doc)

  const provider = new HocuspocusCollabProvider({
    url: collaboratorUrl,
    name: documentId,
    document: ydoc,
    token,
    parameters: { content },
    onConnect: () => {
      void setPlatformStatus(OK)
    },
    onClose: (data) => {
      if (data.event.code === 1006) {
        console.error('Failed to connect to collaborator', data.event)
        const status = new Status(Severity.ERROR, plugin.string.CannotConnectToCollaborationService, {})
        void setPlatformStatus(status)
      }
    }
  })

  return provider
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
