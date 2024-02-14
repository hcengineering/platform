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

import { Doc, Ref } from './classes'

/**
 * Identifier of the collaborative document holding collaborative content.
 *
 * Format:
 * {minioDocumentId}:{versionId}:{revisionId}
 * {minioDocumentId}:{versionId}
 *
 * @public
 * */
export type CollaborativeDoc = string & { __collaborativeDocId: true }

/** @public */
export type CollaborativeDocVersion = string | typeof CollaborativeDocVersionHead

/** @public */
export const CollaborativeDocVersionHead = 'HEAD'

/** @public */
export function collaborativeDoc<T extends Doc> (
  docId: Ref<T>,
  attribute: string | undefined
): CollaborativeDoc {
  const minioDocumentId = attribute !== undefined ? `${docId}%${attribute}` : `${docId}`

  return formatCollaborativeDoc({
    documentId: minioDocumentId,
    versionId: CollaborativeDocVersionHead,
    revisionId: '0'
  })
}

/** @public */
export interface CollaborativeDocData {
  documentId: string
  versionId: CollaborativeDocVersion
  revisionId: string
}

/** @public */
export function parseCollaborativeDoc (id: CollaborativeDoc): CollaborativeDocData {
  const [documentId, versionId, revisionId] = id.split(':')
  return { documentId, versionId, revisionId: revisionId ?? versionId }
}

/** @public */
export function formatCollaborativeDoc ({ documentId, versionId, revisionId }: CollaborativeDocData): CollaborativeDoc {
  return `${documentId}:${versionId}:${revisionId}` as CollaborativeDoc
}

/** @public */
export function formatCollaborativeDocVersion ({ documentId, versionId }: Omit<CollaborativeDocData, 'revisionId'>): CollaborativeDoc {
  return `${documentId}:${versionId}` as CollaborativeDoc
}
