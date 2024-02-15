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
  toCollaborativeDocVersion
} from '@hcengineering/core'
import { YDocVersion } from './history/history'
import { collaborativeDocumentUri, mongodbDocumentUri } from './uri'

/** @public */
export interface CollaborativeDocSnapshotParams {
  snapshotName: string
}

/** @public */
export interface CollaborativeDocSnapshotInfo {
  collaborativeDoc: CollaborativeDoc
}

/** @public */
export interface CollaboratorClient {
  get: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string) => Promise<Markup>
  update: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: Markup) => Promise<void>
  snapshot: (collaborativeDoc: CollaborativeDoc, snapshotName: CollaborativeDocSnapshotParams) => Promise<CollaborativeDocSnapshotInfo>
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

    return await res.json()
  }

  async get (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string): Promise<Markup> {
    const workspace = this.workspace.name
    const documentId = collaborativeDocumentUri(workspace, collaborativeDoc(docId, attribute))
    const initialContentId = this.initialContentId(workspace, classId, docId, attribute)

    const res = await this.rpc(
      'getDocumentContent',
      { documentId, initialContentId, field: attribute }
    )

    return res.html ?? '<p></p>'
  }

  async update (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: Markup): Promise<void> {
    const workspace = this.workspace.name
    const documentId = collaborativeDocumentUri(workspace, collaborativeDoc(docId, attribute))
    const initialContentId = this.initialContentId(workspace, classId, docId, attribute)

    await this.rpc(
      'updateDocumentContent',
      { documentId, initialContentId, field: attribute, html: value }
    )
  }

  async snapshot (
    collaborativeDoc: CollaborativeDoc,
    params: CollaborativeDocSnapshotParams
  ): Promise<CollaborativeDocSnapshotInfo> {
    const workspace = this.workspace.name
    const documentId = collaborativeDocumentUri(workspace, collaborativeDoc)

    const res = await this.rpc(
      'takeSnapshot',
      { documentId, collaborativeDoc, ...params }
    ) as YDocVersion

    return {
      collaborativeDoc: toCollaborativeDocVersion(collaborativeDoc, res.versionId)
    }
  }
}
