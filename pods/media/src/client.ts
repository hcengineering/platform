//
// Copyright © 2025 Hardcore Engineering Inc.
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

import attachment, { type Attachment } from '@hcengineering/attachment'
import drive, { FileVersion } from '@hcengineering/drive'
import core, {
  BlobMetadata,
  Class,
  Client,
  Doc,
  DocumentQuery,
  DomainParams,
  DomainRequestOptions,
  DomainResult,
  FindOptions,
  FindResult,
  Hierarchy,
  MeasureContext,
  ModelDb,
  OperationDomain,
  Ref,
  SearchOptions,
  SearchQuery,
  SearchResult,
  systemAccountUuid,
  Tx,
  TxOperations,
  TxResult,
  WithLookup,
  WorkspaceUuid
} from '@hcengineering/core'
import { type RestClient, createRestClient } from '@hcengineering/api-client'
import { getTransactorEndpoint } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { MessageEventType } from '@hcengineering/communication-sdk-types'

import { BlobSourceType, type VideoTranscodeResult } from './types'

async function getClient (workspace: WorkspaceUuid, token: string): Promise<Client> {
  const endpoint = await getTransactorEndpoint(token)
  const client = createRestClient(toHttpUrl(endpoint), workspace, token)
  const { model, hierarchy } = await client.getModel()
  return new RestClientAdapter(client, hierarchy, model)
}

/**
 * @public
 */
export class Controller {
  private readonly workspaces: Map<WorkspaceUuid, WorkspaceClient> = new Map<WorkspaceUuid, WorkspaceClient>()

  async get (workspace: WorkspaceUuid): Promise<WorkspaceClient> {
    let client = this.workspaces.get(workspace)
    if (client === undefined) {
      client = await WorkspaceClient.create(workspace)
      this.workspaces.set(workspace, client)
    }

    return client
  }

  async close (): Promise<void> {
    for (const workspace of this.workspaces.values()) {
      await workspace.close()
    }
    this.workspaces.clear()
  }
}

/**
 * @public
 */
export class WorkspaceClient {
  private constructor (
    readonly workspace: WorkspaceUuid,
    readonly client: Client
  ) {}

  static async create (workspace: WorkspaceUuid): Promise<WorkspaceClient> {
    const token = generateToken(systemAccountUuid, workspace, { service: 'media' })
    const client = await getClient(workspace, token)
    return new WorkspaceClient(workspace, client)
  }

  async close (): Promise<void> {
    await this.client.close()
  }

  async updateBlobMetadata (ctx: MeasureContext, result: VideoTranscodeResult, metadata: BlobMetadata): Promise<void> {
    if (result.source.source !== BlobSourceType.Doc) {
      return
    }

    const { objectClass, objectId } = result.source

    const hierarchy = this.client.getHierarchy()
    const txOps = new TxOperations(this.client, core.account.System)

    if (hierarchy.isDerived(objectClass, attachment.class.Attachment)) {
      const doc = await txOps.findOne(attachment.class.Attachment, { _id: objectId as Ref<Attachment> })
      if (doc !== undefined) {
        await txOps.update(doc, { ...doc.metadata, ...metadata })
      }
    }

    if (hierarchy.isDerived(objectClass, drive.class.FileVersion)) {
      const doc = await txOps.findOne(drive.class.FileVersion, { _id: objectId as Ref<FileVersion> })
      if (doc !== undefined) {
        await txOps.update(doc, { ...doc.metadata, ...metadata })
      }
    }
  }

  async updateCommMetadata (ctx: MeasureContext, result: VideoTranscodeResult, metadata: BlobMetadata): Promise<void> {
    if (result.source.source !== BlobSourceType.Message) {
      return
    }

    const txOps = new TxOperations(this.client, core.account.System)
    await txOps.domainRequest('communication' as OperationDomain, {
      event: {
        type: MessageEventType.AttachmentPatch,
        cardId: result.source.cardId,
        messageId: result.source.messageId,
        operations: [
          {
            opcode: 'update',
            attachments: [
              {
                id: result.blobId,
                params: { metadata }
              }
            ]
          }
        ]
      }
    })
  }
}

function toHttpUrl (url: string): string {
  return url.replace('ws://', 'http://').replace('wss://', 'https://')
}

class RestClientAdapter implements Client {
  constructor (
    private readonly client: RestClient,
    private readonly hierarchy: Hierarchy | undefined,
    private readonly model: ModelDb | undefined
  ) {}

  async domainRequest<T>(
    domain: OperationDomain,
    params: DomainParams,
    options?: DomainRequestOptions
  ): Promise<DomainResult<T>> {
    return await this.client.domainRequest(domain, params, options)
  }

  async findAll<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return await this.client.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    return await this.client.tx(tx)
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return await this.client.findOne(_class, query, options)
  }

  async searchFulltext (query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return await this.client.searchFulltext(query, options)
  }

  async close (): Promise<void> {
    // No ned to close the REST client
  }

  getHierarchy (): Hierarchy {
    if (this.hierarchy === undefined) {
      throw new Error('Hierarchy is not defined')
    }
    return this.hierarchy
  }

  getModel (): ModelDb {
    if (this.model === undefined) {
      throw new Error('Model is not defined')
    }
    return this.model
  }
}
