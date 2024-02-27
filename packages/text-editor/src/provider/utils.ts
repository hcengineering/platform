//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { type Class, type CollaborativeDoc, type Doc, type Ref } from '@hcengineering/core'
import {
  type DocumentURI,
  collaborativeDocumentUri,
  mongodbDocumentUri,
  platformDocumentUri
} from '@hcengineering/collaborator-client'
import { type KeyedAttribute, getClient } from '@hcengineering/presentation'
import { getCurrentLocation } from '@hcengineering/ui'

function getWorkspace (): string {
  return getCurrentLocation().path[1] ?? ''
}

export function collaborativeDocumentId (docId: CollaborativeDoc): DocumentURI {
  const workspace = getWorkspace()
  return collaborativeDocumentUri(workspace, docId)
}

export function platformDocumentId (objectClass: Ref<Class<Doc>>, objectId: Ref<Doc>, objectAttr: string): DocumentURI {
  const workspace = getWorkspace()
  return platformDocumentUri(workspace, objectClass, objectId, objectAttr)
}

export function mongodbDocumentId (docId: Ref<Doc>, attr: KeyedAttribute): DocumentURI {
  const workspace = getWorkspace()
  const domain = getClient().getHierarchy().getDomain(attr.attr.attributeOf)
  return mongodbDocumentUri(workspace, domain, docId, attr.key)
}
