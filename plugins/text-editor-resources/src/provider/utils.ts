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
  formatMinioDocumentId,
  formatPlatformDocumentId as origFormatPlatformDocumentId
} from '@hcengineering/collaborator-client'
import { getCurrentLocation } from '@hcengineering/ui'

function getWorkspace (): string {
  return getCurrentLocation().path[1] ?? ''
}

export function formatCollaborativeDocumentId (collaborativeDoc: CollaborativeDoc): DocumentId {
  const workspace = getWorkspace()
  return formatMinioDocumentId(workspace, collaborativeDoc)
}

export function formatPlatformDocumentId (
  objectClass: Ref<Class<Doc>>,
  objectId: Ref<Doc>,
  objectAttr: string
): PlatformDocumentId {
  return origFormatPlatformDocumentId(objectClass, objectId, objectAttr)
}
