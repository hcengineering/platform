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

import type { Doc, Ref } from '@hcengineering/core'
import { type KeyedAttribute, getClient } from '@hcengineering/presentation'
import { getCurrentLocation } from '@hcengineering/ui'

import { type DocumentId } from './tiptap'

function getWorkspace (): string {
  return getCurrentLocation().path[1] ?? ''
}

export function minioDocumentId (docId: Ref<Doc>, attr?: KeyedAttribute): DocumentId {
  const workspace = getWorkspace()
  return attr !== undefined
    ? (`minio://${workspace}/${docId}%${attr.key}` as DocumentId)
    : (`minio://${workspace}/${docId}` as DocumentId)
}

export function platformDocumentId (docId: Ref<Doc>, attr: KeyedAttribute): DocumentId {
  const workspace = getWorkspace()
  return `platform://${workspace}/${attr.attr.attributeOf}/${docId}/${attr.key}` as DocumentId
}

export function mongodbDocumentId (docId: Ref<Doc>, attr: KeyedAttribute): DocumentId {
  const workspace = getWorkspace()
  const domain = getClient().getHierarchy().getDomain(attr.attr.attributeOf)
  return `mongodb://${workspace}/${domain}/${docId}/${attr.key}` as DocumentId
}
