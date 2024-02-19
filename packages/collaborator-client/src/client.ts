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
  Account,
  Class,
  CollaborativeDoc,
  Doc,
  Hierarchy,
  Markup,
  Ref,
  Timestamp,
  WorkspaceId,
  concatLink,
  getCollaborativeDoc,
  getCollaborativeDocId,
  toCollaborativeDocVersion
} from '@hcengineering/core'
import { DocumentURI, collaborativeDocumentUri, mongodbDocumentUri } from './uri'

/** @public */
export interface GetDocumentContentRequest {
  documentId: DocumentURI
  initialContentId: DocumentURI
  field: string
}

/** @public */
export interface GetDocumentContentResponse {
  html: string
}

/** @public */
export interface UpdateDocumentContentRequest {
  documentId: DocumentURI
  initialContentId: DocumentURI
  field: string
  html: string
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UpdateDocumentContentResponse {}

/** @public */
export interface TakeSnapshotRequest {
  documentId: DocumentURI
  collaborativeDoc: CollaborativeDoc
  createdBy: string
  snapshotName: string
}

/** @public */
export interface TakeSnapshotResponse {
  versionId: string
  name: string

  createdBy: string
  createdOn: Timestamp
}

/** @public */
export interface CollaborativeDocSnapshotParams {
  snapshotName: string
  createdBy: Ref<Account>
}

/** @public */
export interface CollaboratorClient {
  get: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string) => Promise<Markup>
  update: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: Markup) => Promise<void>
  snapshot: (collaborativeDoc: CollaborativeDoc, params: CollaborativeDocSnapshotParams) => Promise<CollaborativeDoc>
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

  initialContentId (workspace: string, classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): DocumentURI {
    const domain = this.hierarchy.getDomain(classId)
    return mongodbDocumentUri(workspace, domain, docId, attribute)
  }

  private async rpc (method: string, payload: any): Promise<any> {
    const url = concatLink(this.collaboratorUrl, '/rpc')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ method, payload })
    })

    const result = await res.json()

    if (result.error != null) {
      throw new Error(result.error)
    }

    return result
  }

  async get (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): Promise<Markup> {
    const workspace = this.workspace.name
    const collaborativeDocId = getCollaborativeDocId(docId, attribute)
    const documentId = collaborativeDocumentUri(workspace, getCollaborativeDoc(collaborativeDocId))
    const initialContentId = this.initialContentId(workspace, classId, docId, attribute)

    const payload: GetDocumentContentRequest = { documentId, initialContentId, field: attribute }
    const res = (await this.rpc('getDocumentContent', payload)) as GetDocumentContentResponse

    return res.html ?? '<p></p>'
  }

  async update (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: Markup): Promise<void> {
    const workspace = this.workspace.name
    const collaborativeDocId = getCollaborativeDocId(docId, attribute)
    const documentId = collaborativeDocumentUri(workspace, getCollaborativeDoc(collaborativeDocId))
    const initialContentId = this.initialContentId(workspace, classId, docId, attribute)

    const payload: UpdateDocumentContentRequest = { documentId, initialContentId, field: attribute, html: value }
    await this.rpc('updateDocumentContent', payload)
  }

  async snapshot (
    collaborativeDoc: CollaborativeDoc,
    params: CollaborativeDocSnapshotParams
  ): Promise<CollaborativeDoc> {
    const workspace = this.workspace.name
    const documentId = collaborativeDocumentUri(workspace, collaborativeDoc)

    const payload: TakeSnapshotRequest = { documentId, collaborativeDoc, ...params }
    const res = (await this.rpc('takeSnapshot', payload)) as TakeSnapshotResponse

    return toCollaborativeDocVersion(collaborativeDoc, res.versionId)
  }
}
