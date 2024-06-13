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

import {
  Class,
  CollaborativeDoc,
  Doc,
  Ref,
  collaborativeDocChain,
  collaborativeDocFormat,
  collaborativeDocParse,
  collaborativeDocUnchain
} from '@hcengineering/core'
import { DocumentId, PlatformDocumentId } from './types'

/** @public */
export function formatMinioDocumentId (workspaceUrl: string, collaborativeDoc: CollaborativeDoc): DocumentId {
  return formatDocumentId('minio', workspaceUrl, collaborativeDoc)
}

/**
 * Formats collaborative document as Hocuspocus document name.
 *
 * The document name is used for document identification on the server so should remain the same even
 * when document is updated. Hence, we remove lastVersionId component from CollaborativeDoc.
 *
 * Example:
 * minio://workspace1/doc1:HEAD/doc2:v1
 *
 * @public
 */
export function formatDocumentId (
  storage: string,
  workspaceUrl: string,
  collaborativeDoc: CollaborativeDoc
): DocumentId {
  const path = collaborativeDocUnchain(collaborativeDoc)
    .map((p) => {
      const { documentId, versionId } = collaborativeDocParse(p)
      return `${documentId}:${versionId}`
    })
    .join('/')

  return `${storage}://${workspaceUrl}/${path}` as DocumentId
}

/** @public */
export function parseDocumentId (documentId: DocumentId): {
  storage: string
  workspaceUrl: string
  collaborativeDoc: CollaborativeDoc
} {
  const [storage, path] = documentId.split('://')
  const [workspaceUrl, ...rest] = path.split('/')

  const collaborativeDocs = rest.map((p) => {
    const [documentId, versionId] = p.split(':')
    return collaborativeDocFormat({ documentId, versionId, lastVersionId: versionId })
  })

  return {
    storage,
    workspaceUrl,
    collaborativeDoc: collaborativeDocChain(...collaborativeDocs)
  }
}

/** @public */
export function formatPlatformDocumentId (
  objectClass: Ref<Class<Doc>>,
  objectId: Ref<Doc>,
  objectAttr: string
): PlatformDocumentId {
  return `${objectClass}/${objectId}/${objectAttr}` as PlatformDocumentId
}

/** @public */
export function parsePlatformDocumentId (platformDocumentId: PlatformDocumentId): {
  objectClass: Ref<Class<Doc>>
  objectId: Ref<Doc>
  objectAttr: string
} {
  const [objectClass, objectId, objectAttr] = platformDocumentId.split('/')
  return {
    objectClass: objectClass as Ref<Class<Doc>>,
    objectId: objectId as Ref<Doc>,
    objectAttr
  }
}
