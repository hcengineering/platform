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
 * {minioDocumentId}:{versionId}:{lastVersionId}
 * {minioDocumentId}:{versionId}
 *
 * Where:
 * - minioDocumentId is an identifier of the document in Minio
 * - versionId is an identifier of the document version, HEAD for latest editable version
 * - lastVersionId is an identifier of the latest available version
 *
 * The collaborative document may contain one or more such sections chained with # (hash):
 * collaborativeDocId#collaborativeDocId#collaborativeDocId#...
 *
 * When collaborative document does not exist, it will be initialized from the first existing
 * document in the list.
 *
 * @public
 * */
export type CollaborativeDoc = string & { __collaborativeDoc: true }

/** @public */
export type CollaborativeDocVersion = string | typeof CollaborativeDocVersionHead

/** @public */
export const CollaborativeDocVersionHead = 'HEAD'

/** @public */
export function getCollaborativeDocId (objectId: Ref<Doc>, objectAttr?: string | undefined): string {
  return objectAttr !== undefined && objectAttr !== '' ? `${objectId}%${objectAttr}` : `${objectId}`
}

/** @public */
export function getCollaborativeDoc (documentId: string): CollaborativeDoc {
  return collaborativeDocFormat({
    documentId,
    versionId: CollaborativeDocVersionHead,
    lastVersionId: CollaborativeDocVersionHead
  })
}

/** @public */
export interface CollaborativeDocData {
  // Id of the document in object storage
  documentId: string
  // Id of the document version
  // HEAD version represents the editable last document version
  // Otherwise, it is a readonly version
  versionId: CollaborativeDocVersion
  // For HEAD versionId it is the latest available document version
  // Otherwise, it is the same value as versionId
  lastVersionId: string

  source?: CollaborativeDoc[]
}

/**
 * Merge several collaborative docs into single collaborative doc train.
 *
 * @public
 */
export function collaborativeDocChain (...docs: CollaborativeDoc[]): CollaborativeDoc {
  return docs.join('#') as CollaborativeDoc
}

/**
 * Split collaborative doc train into separate collaborative docs.
 *
 * @public
 */
export function collaborativeDocUnchain (doc: CollaborativeDoc): CollaborativeDoc[] {
  return doc.split('#') as CollaborativeDoc[]
}

/** @public */
export function collaborativeDocParse (doc: CollaborativeDoc): CollaborativeDocData {
  const [first, ...other] = collaborativeDocUnchain(doc)
  const [documentId, versionId, lastVersionId] = first.split(':')
  return {
    documentId,
    versionId: versionId ?? CollaborativeDocVersionHead,
    lastVersionId: lastVersionId ?? versionId ?? CollaborativeDocVersionHead,
    source: other
  }
}

const sanitize = (value: string): string => value.replace(/[:#]/g, '%')

/** @public */
export function collaborativeDocFormat ({
  documentId,
  versionId,
  lastVersionId,
  source
}: CollaborativeDocData): CollaborativeDoc {
  const parts = [sanitize(documentId), sanitize(versionId), sanitize(lastVersionId)]
  const collaborativeDoc = parts.join(':') as CollaborativeDoc
  return collaborativeDocChain(collaborativeDoc, ...(source ?? []))
}

/**
 * Updates versionId component in the collaborative document.
 * Both versionId and lastVersionId will refer to the same collaborative document version.
 *
 * When versionId is not HEAD, the document will represent a readonly document version (snapshot).
 *
 * @public
 */
export function collaborativeDocWithVersion (collaborativeDoc: CollaborativeDoc, versionId: string): CollaborativeDoc {
  const { documentId, source } = collaborativeDocParse(collaborativeDoc)
  return collaborativeDocFormat({ documentId, versionId, lastVersionId: versionId, source })
}

/**
 * Updates lastVersionId component in the collaborative document.
 *
 * When document versionId is HEAD, the function is no-op.
 *
 * @public
 */
export function collaborativeDocWithLastVersion (
  collaborativeDoc: CollaborativeDoc,
  lastVersionId: string
): CollaborativeDoc {
  const { documentId, versionId, source } = collaborativeDocParse(collaborativeDoc)
  return versionId === CollaborativeDocVersionHead
    ? collaborativeDocFormat({ documentId, versionId, lastVersionId, source })
    : collaborativeDoc
}

/**
 * Replaces source component in the collaborative document.
 *
 * @public
 */
export function collaborativeDocWithSource (
  collaborativeDoc: CollaborativeDoc,
  source: CollaborativeDoc
): CollaborativeDoc {
  const { documentId, versionId, lastVersionId } = collaborativeDocParse(collaborativeDoc)
  return collaborativeDocFormat({ documentId, versionId, lastVersionId, source: [source] })
}

/**
 * Creates collaborative document that refers to the last version from the source collaborative document.
 *
 * @public
 */
export function collaborativeDocFromLastVersion (collaborativeDoc: CollaborativeDoc): CollaborativeDoc {
  const { documentId, lastVersionId, source } = collaborativeDocParse(collaborativeDoc)
  return collaborativeDocFormat({
    documentId,
    versionId: lastVersionId,
    lastVersionId,
    source
  })
}

/**
 * Creates collaborative document that refers to the last version from the source collaborative document.
 *
 * @public
 */
export function collaborativeDocFromCollaborativeDoc (
  collaborativeDoc: CollaborativeDoc,
  sourceCollaborativeDoc: CollaborativeDoc
): CollaborativeDoc {
  return collaborativeDocWithSource(collaborativeDoc, collaborativeDocFromLastVersion(sourceCollaborativeDoc))
}
