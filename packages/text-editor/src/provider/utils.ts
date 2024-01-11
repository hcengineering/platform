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

import { type DocumentId } from './tiptap'

export function minioDocumentId (docId: Ref<Doc>, attr?: KeyedAttribute): DocumentId {
  return attr !== undefined ? `minio://${docId}%${attr.key}` : `minio://${docId}`
}

export function platformDocumentId (docId: Ref<Doc>, attr: KeyedAttribute): DocumentId {
  return `platform://${attr.attr.attributeOf}/${docId}/${attr.key}`
}

export function mongodbDocumentId (docId: Ref<Doc>, attr: KeyedAttribute): DocumentId {
  const domain = getClient().getHierarchy().getDomain(attr.attr.attributeOf)
  return `mongodb://${domain}/${docId}/${attr.key}`
}
