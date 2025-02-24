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

import { Class, CollaborativeDoc, Doc, Ref } from '@hcengineering/core'

/** @public */
export function encodeDocumentId (workspaceId: string, documentId: CollaborativeDoc): string {
  const { objectClass, objectId, objectAttr } = documentId
  return [workspaceId, objectClass, objectId, objectAttr].join('|')
}

/** @public */
export function decodeDocumentId (documentId: string): {
  workspaceId: string
  documentId: CollaborativeDoc
} {
  const [workspaceId, objectClass, objectId, objectAttr] = documentId.split('|')
  return {
    workspaceId,
    documentId: {
      objectClass: objectClass as Ref<Class<Doc>>,
      objectId: objectId as Ref<Doc>,
      objectAttr
    }
  }
}
