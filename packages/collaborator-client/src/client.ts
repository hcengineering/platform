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
  CollaborativeDoc,
  Hierarchy,
  Markup,
  Ref,
  Timestamp,
  WorkspaceId,
  collaborativeDocWithLastVersion,
  collaborativeDocWithVersion,
  concatLink
} from '@hcengineering/core'
import { DocumentId } from './types'
import { formatMinioDocumentId } from './utils'

/** @public */
export interface DocumentSnapshotParams {
  createdBy: Ref<Account>
  versionId: string
  versionName?: string
}

/** @public */
export interface GetContentRequest {
  documentId: DocumentId
  field: string
}

/** @public */
export interface GetContentResponse {
  markup: string
}

/** @public */
export interface UpdateContentRequest {
  documentId: DocumentId
  field: string
  markup: Markup
  snapshot?: DocumentSnapshotParams
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UpdateContentResponse {}

/** @public */
export interface CopyContentRequest {
  documentId: DocumentId
  sourceField: string
  targetField: string
  snapshot?: DocumentSnapshotParams
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CopyContentResponse {}

/** @public */
export interface BranchDocumentRequest {
  sourceDocumentId: DocumentId
  targetDocumentId: DocumentId
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BranchDocumentResponse {}

/** @public */
export interface RemoveDocumentRequest {
  documentId: DocumentId
}

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RemoveDocumentResponse {}

/** @public */
export interface TakeSnapshotRequest {
  documentId: DocumentId
  snapshot: DocumentSnapshotParams
}

/** @public */
export interface TakeSnapshotResponse {
  versionId: string
  name: string

  createdBy: Ref<Account>
  createdOn: Timestamp
}

/** @public */
export interface CollaboratorClient {
  // field operations
  getContent: (collaborativeDoc: CollaborativeDoc, field: string) => Promise<Markup>
  updateContent: (
    document: CollaborativeDoc,
    field: string,
    value: Markup,
    snapshot?: DocumentSnapshotParams
  ) => Promise<CollaborativeDoc>
  copyContent: (
    document: CollaborativeDoc,
    sourceField: string,
    targetField: string,
    snapshot?: DocumentSnapshotParams
  ) => Promise<CollaborativeDoc>

  // document operations
  branch: (source: CollaborativeDoc, target: CollaborativeDoc) => Promise<void>
  remove: (collaborativeDoc: CollaborativeDoc) => Promise<void>
  snapshot: (collaborativeDoc: CollaborativeDoc, params: DocumentSnapshotParams) => Promise<CollaborativeDoc>
}

/** @public */
export function getClient (
  hierarchy: Hierarchy,
  workspaceId: WorkspaceId,
  token: string,
  collaboratorUrl: string
): CollaboratorClient {
  const url = collaboratorUrl.replaceAll('wss://', 'https://').replace('ws://', 'http://')
  return new CollaboratorClientImpl(hierarchy, workspaceId, token, url)
}

class CollaboratorClientImpl implements CollaboratorClient {
  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly workspace: WorkspaceId,
    private readonly token: string,
    private readonly collaboratorUrl: string
  ) {}

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

  async getContent (document: CollaborativeDoc, field: string): Promise<Markup> {
    const workspace = this.workspace.name

    const documentId = formatMinioDocumentId(workspace, document)
    const payload: GetContentRequest = { documentId, field }
    const res = (await this.rpc('getContent', payload)) as GetContentResponse

    return res.markup ?? ''
  }

  async updateContent (
    document: CollaborativeDoc,
    field: string,
    markup: Markup,
    snapshot?: DocumentSnapshotParams
  ): Promise<CollaborativeDoc> {
    const workspace = this.workspace.name

    const documentId = formatMinioDocumentId(workspace, document)
    const payload: UpdateContentRequest = { documentId, field, markup, snapshot }
    await this.rpc('updateContent', payload)

    return snapshot !== undefined
      ? collaborativeDocWithLastVersion(document, snapshot.versionId)
      : document
  }

  async copyContent (
    document: CollaborativeDoc,
    sourceField: string,
    targetField: string,
    snapshot?: DocumentSnapshotParams
  ): Promise<CollaborativeDoc> {
    const workspace = this.workspace.name

    const documentId = formatMinioDocumentId(workspace, document)
    const payload: CopyContentRequest = { documentId, sourceField, targetField, snapshot }
    await this.rpc('copyContent', payload)

    return snapshot !== undefined
      ? collaborativeDocWithLastVersion(document, snapshot.versionId)
      : document
  }

  async branch (source: CollaborativeDoc, target: CollaborativeDoc): Promise<void> {
    const workspace = this.workspace.name

    const sourceDocumentId = formatMinioDocumentId(workspace, source)
    const targetDocumentId = formatMinioDocumentId(workspace, target)

    const payload: BranchDocumentRequest = { sourceDocumentId, targetDocumentId }
    await this.rpc('branchDocument', payload)
  }

  async remove (document: CollaborativeDoc): Promise<void> {
    const workspace = this.workspace.name

    const documentId = formatMinioDocumentId(workspace, document)

    const payload: RemoveDocumentRequest = { documentId }
    await this.rpc('removeDocument', payload)
  }

  async snapshot (document: CollaborativeDoc, snapshot: DocumentSnapshotParams): Promise<CollaborativeDoc> {
    const workspace = this.workspace.name

    const documentId = formatMinioDocumentId(workspace, document)
    const payload: TakeSnapshotRequest = { documentId, snapshot }
    const res = (await this.rpc('takeSnapshot', payload)) as TakeSnapshotResponse

    return collaborativeDocWithVersion(document, res.versionId)
  }
}
