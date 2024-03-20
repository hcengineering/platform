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

import { Class, CollaborativeDoc, Doc, Domain, Ref, collaborativeDocParse } from '@hcengineering/core'

export type DocumentURI = string & { __documentUri: true }

export function collaborativeDocumentUri (workspaceUrl: string, docId: CollaborativeDoc): DocumentURI {
  const { documentId, versionId } = collaborativeDocParse(docId)
  return `minio://${workspaceUrl}/${documentId}/${versionId}` as DocumentURI
}

export function platformDocumentUri (
  workspaceUrl: string,
  objectClass: Ref<Class<Doc>>,
  objectId: Ref<Doc>,
  objectAttr: string
): DocumentURI {
  return `platform://${workspaceUrl}/${objectClass}/${objectId}/${objectAttr}` as DocumentURI
}

export function mongodbDocumentUri (
  workspaceUrl: string,
  domain: Domain,
  docId: Ref<Doc>,
  objectAttr: string
): DocumentURI {
  return `mongodb://${workspaceUrl}/${domain}/${docId}/${objectAttr}` as DocumentURI
}
