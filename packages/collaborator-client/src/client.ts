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

import core, {
  Class,
  CollaborativeDocumentId,
  Doc,
  Ref,
  TxOperations,
  WorkspaceId,
  concatLink
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { LiveQuery } from '@hcengineering/query'
import { ServerKit, htmlToYDoc } from '@hcengineering/text'
import { Extensions } from '@tiptap/core'
import { Doc as YDoc, applyUpdate, encodeStateAsUpdate } from 'yjs'

/**
 * @public
 */
export interface CollaboratorClient {
  update: (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: string) => Promise<void>
  close: () => Promise<void>
}

/**
 * @public
 */
export function getClient (
  client: TxOperations,
  minio: MinioService,
  token: string,
  workspaceId: WorkspaceId,
  collaboratorUrl: string,
  uploadUrl: string
): CollaboratorClient {
  return new CollaboratorClientImpl(client, minio, token, workspaceId, collaboratorUrl, uploadUrl)
}

class CollaboratorClientImpl implements CollaboratorClient {
  private readonly lq: LiveQuery
  private readonly extensions: Extensions

  private documents: Set<CollaborativeDocumentId> = new Set<CollaborativeDocumentId>()

  constructor (
    private readonly client: TxOperations,
    private readonly minio: MinioService,
    private readonly token: string,
    private readonly workspaceId: WorkspaceId,
    private readonly collaboratorUrl: string,
    uploadUrl: string
  ) {
    this.lq = new LiveQuery(client)

    this.extensions = [
      ServerKit.configure({ image: { uploadUrl } })
    ]

    this.queryCollaborationState()
  }

  private queryCollaborationState (): void {
    this.lq.query(core.class.CollaborationState, { _id: core.collaboration.CollaborationState }, (res) => {
      const documents = res[0]?.documents ?? []
      this.documents = new Set(documents)
    })
  }

  async update (classId: Ref<Class<Doc>>, docId: Ref<Doc>, attribute: string, value: string): Promise<void> {
    const minioDocumentId = `${docId}%${attribute}`
    const documentId = `minio://${minioDocumentId}`

    if (this.documents.has(documentId) || this.documents.has(minioDocumentId)) {
      // the document is being edited right now, update through collaborator
      const url = concatLink(this.collaboratorUrl, `/api/content/${classId}/${docId}/${attribute}`)
      await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + this.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ html: value })
      })
    } else {
      // the document is not loaded, can update in minio directly
      const current = new YDoc()

      try {
        const buffer = await this.minio.read(this.workspaceId, minioDocumentId)
        const minioDocument = Buffer.concat(buffer)
        const uint8arr = new Uint8Array(minioDocument)

        applyUpdate(current, uint8arr)

        // remove all content of the current fragment
        const fragment = current.getXmlFragment(attribute)
        fragment.delete(0, fragment.length)
      } catch (err: any) {
        // the document does not exist in minio yet
      }

      // Apply new content on top of existing
      const ydoc = htmlToYDoc(value, attribute, this.extensions)
      applyUpdate(current, encodeStateAsUpdate(ydoc))

      // Save document
      const updates = encodeStateAsUpdate(current)
      const buffer = Buffer.from(updates.buffer)

      const metadata = { 'content-type': 'application/ydoc' }
      await this.minio.put(this.workspaceId, minioDocumentId, buffer, buffer.length, metadata)
    }
  }

  async close (): Promise<void> {
    await this.lq.close()
  }
}
