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

import {
  Class,
  CollaborativeDoc,
  Doc,
  Hierarchy,
  Markup,
  Ref,
  WorkspaceId,
  collaborativeDoc,
  concatLink,
  formatCollaborativeDocVersion,
  getCurrentAccount,
  parseCollaborativeDoc
} from '@hcengineering/core'
import { YDocVersion } from './history/history'
import { collaborativeDocumentUri, mongodbDocumentUri } from './uri'

/** @public */
export interface CollaborativeDocSnapshotParams {
  name: string
}

/** @public */
export interface CollaboratorClient {
  get: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string) => Promise<Markup>
  update: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: Markup) => Promise<void>
  snapshot: (collaborativeDoc: CollaborativeDoc, params: CollaborativeDocSnapshotParams) => Promise<CollaborativeDoc>

  getDoc: (collaborativeDoc: CollaborativeDoc, attribute: string) => Promise<Markup>
}

/** @public */
export function getClient (
  hierarchy: Hierarchy,
  workspaceId: WorkspaceId,
  token: string,
  collaboratorUrl: string
): CollaboratorClient {
  return new CollaboratorClientImpl(hierarchy, workspaceId, token, collaboratorUrl)
}

class CollaboratorClientImpl implements CollaboratorClient {
  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly workspace: WorkspaceId,
    private readonly token: string,
    private readonly collaboratorUrl: string
  ) {}

  initialContentId (workspace: string, classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): string {
    const domain = this.hierarchy.getDomain(classId)
    return mongodbDocumentUri(workspace, domain, docId, attribute)
  }

  async get (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): Promise<Markup> {
    const workspace = this.workspace.name
    const documentId = encodeURIComponent(collaborativeDocumentUri(workspace, collaborativeDoc(docId, attribute)))
    const initialContentId = encodeURIComponent(this.initialContentId(workspace, classId, docId, attribute))
    attribute = encodeURIComponent(attribute)

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

  async getDoc (collaborativeDoc: CollaborativeDoc, attribute: string): Promise<Markup> {
    const workspace = this.workspace.name
    const documentId = encodeURIComponent(collaborativeDocumentUri(workspace, collaborativeDoc))
    const field = encodeURIComponent(attribute)

    const url = concatLink(
      this.collaboratorUrl,
      `/api/content/${documentId}/${field}`
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
    const workspace = this.workspace.name
    const documentId = encodeURIComponent(collaborativeDocumentUri(workspace, collaborativeDoc(docId, attribute)))
    const initialContentId = encodeURIComponent(this.initialContentId(workspace, classId, docId, attribute))
    attribute = encodeURIComponent(attribute)

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

  async snapshot (
    collaborativeDoc: CollaborativeDoc,
    params: CollaborativeDocSnapshotParams
  ): Promise<CollaborativeDoc> {
    const workspace = this.workspace.name
    const encodedDocumentId = encodeURIComponent(
      collaborativeDocumentUri(workspace, collaborativeDoc)
    )

    const url = concatLink(this.collaboratorUrl, `/api/document/${encodedDocumentId}/snapshot`)

    const payload = {
      ...params,
      createdBy: getCurrentAccount()._id,
      createdOn: Date.now()
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (res.status !== 200) {
      throw new Error('Failed to create snapshot')
    }

    const result = await res.json() as YDocVersion

    // TODO we should probably return this from API
    const { documentId } = parseCollaborativeDoc(collaborativeDoc)

    return formatCollaborativeDocVersion({ documentId, versionId: result.versionId })
  }
}
