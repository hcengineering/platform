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

import { Class, Doc, Hierarchy, Markup, Ref, concatLink } from '@hcengineering/core'
import { minioDocumentId, mongodbDocumentId } from './utils'

/**
 * @public
 */
export interface CollaboratorClient {
  get: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string) => Promise<Markup>
  update: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: Markup) => Promise<void>
}

/**
 * @public
 */
export function getClient (hierarchy: Hierarchy, token: string, collaboratorUrl: string): CollaboratorClient {
  return new CollaboratorClientImpl(hierarchy, token, collaboratorUrl)
}

class CollaboratorClientImpl implements CollaboratorClient {
  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly token: string,
    private readonly collaboratorUrl: string
  ) {}

  initialContentId (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): string {
    const domain = this.hierarchy.getDomain(classId)
    return mongodbDocumentId(domain, docId, attribute)
  }

  async get (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): Promise<Markup> {
    const documentId = minioDocumentId(docId, attribute)
    const initialContentId = this.initialContentId(classId, docId, attribute)

    const url = concatLink(
      this.collaboratorUrl,
      `/api/content/${documentId}/${attribute}?initialContentId=${initialContentId}`
    )

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + this.token,
        Accept: 'application/json'
      }
    })
    const json = await res.json()
    return json.html ?? '<p></p>'
  }

  async update (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: Markup): Promise<void> {
    const documentId = minioDocumentId(docId, attribute)
    const initialContentId = this.initialContentId(classId, docId, attribute)

    const url = concatLink(
      this.collaboratorUrl,
      `/api/content/${documentId}/${attribute}?initialContentId=${initialContentId}`
    )

    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ html: value })
    })
  }
}
