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

import { Class, CollaborativeDoc, Doc, Domain, Ref } from '@hcengineering/core'
import { DocumentId, PlatformDocumentId } from './types'

/** @public */
export function parseDocumentName (documentName: string): DocumentId {
  const [workspaceUrl, documentId, versionId] = documentName.split('/')
  return { workspaceUrl, documentId, versionId }
}

/** @public */
export function parseCollaborativeDocId (collaborativeDocId: string | null | undefined): CollaborativeDoc | undefined {
  return collaborativeDocId != null ? (collaborativeDocId as CollaborativeDoc) : undefined
}

/** @public */
export function parsePlatformDocumentId (platformDocumentId: string | null | undefined): PlatformDocumentId | undefined {
  if (platformDocumentId != null) {
    const [objectDomain, objectClass, objectId, objectAttr] = platformDocumentId.split('/')
    if (
      objectDomain !== undefined &&
      objectDomain !== '' &&
      objectClass !== undefined &&
      objectClass !== '' &&
      objectId !== undefined &&
      objectId !== '' &&
      objectAttr !== undefined &&
      objectAttr !== ''
    ) {
      return {
        objectDomain: objectDomain as Domain,
        objectClass: objectClass as Ref<Class<Doc>>,
        objectId: objectId as Ref<Doc>,
        objectAttr
      }
    }
  }
  return undefined
}
