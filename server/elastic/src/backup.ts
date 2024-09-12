//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Client } from '@elastic/elasticsearch'
import {
  Class,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  Domain,
  FindOptions,
  FindResult,
  Hierarchy,
  IndexingConfiguration,
  Iterator,
  MeasureContext,
  Ref,
  StorageIterator,
  toWorkspaceString,
  Tx,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import serverCore, { DbAdapter, DbAdapterHandler, type DomainHelperOperations } from '@hcengineering/server-core'

function getIndexName (): string {
  return getMetadata(serverCore.metadata.ElasticIndexName) ?? 'storage_index'
}

function getIndexVersion (): string {
  return getMetadata(serverCore.metadata.ElasticIndexVersion) ?? 'v1'
}

class ElasticDataAdapter implements DbAdapter {
  private readonly workspaceString: string
  private readonly getFulltextDocId: (doc: Ref<Doc>) => Ref<Doc>
  private readonly getDocId: (fulltext: Ref<Doc>) => Ref<Doc>
  private readonly indexName: string

  constructor (
    readonly workspaceId: WorkspaceId,
    private readonly client: Client,
    readonly indexBaseName: string,
    readonly indexVersion: string
  ) {
    this.indexName = `${indexBaseName}_${indexVersion}`
    this.workspaceString = toWorkspaceString(workspaceId)
    this.getFulltextDocId = (doc) => `${doc}@${this.workspaceString}` as Ref<Doc>
    this.getDocId = (fulltext) => fulltext.slice(0, -1 * (this.workspaceString.length + 1)) as Ref<Doc>
  }

  init?: ((domains?: string[], excludeDomains?: string[]) => Promise<void>) | undefined
  on?: ((handler: DbAdapterHandler) => void) | undefined

  async traverse<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Pick<FindOptions<T>, 'sort' | 'limit' | 'projection'>
  ): Promise<Iterator<T>> {
    throw new Error('Method not implemented.')
  }

  helper (): DomainHelperOperations {
    return {
      create: async () => {},
      exists: async () => true,
      listDomains: async () => new Set(),
      createIndex: async () => {},
      dropIndex: async () => {},
      listIndexes: async () => [],
      estimatedCount: async () => 0
    }
  }

  async groupBy<T, D extends Doc = Doc>(
    ctx: MeasureContext,
    domain: Domain,
    field: string,
    query?: DocumentQuery<D>
  ): Promise<Set<T>> {
    return new Set()
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return Object.assign([], { total: 0 })
  }

  async tx (ctx: MeasureContext, ...tx: Tx[]): Promise<TxResult[]> {
    return []
  }

  async createIndexes (domain: Domain, config: Pick<IndexingConfiguration<Doc>, 'indexes'>): Promise<void> {}
  async removeOldIndex (domain: Domain, deletePattern: RegExp[], keepPattern: RegExp[]): Promise<void> {}

  async close (): Promise<void> {
    await this.client.close()
  }

  find (ctx: MeasureContext, domain: Domain): StorageIterator {
    throw new Error('Method not implemented.')
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    throw new Error('Method not implemented.')
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async update (ctx: MeasureContext, domain: Domain, operations: Map<Ref<Doc>, DocumentUpdate<Doc>>): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async rawFindAll<T extends Doc>(domain: Domain, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<T[]> {
    throw new Error('Method not implemented.')
  }

  async rawUpdate<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    operations: DocumentUpdate<T>
  ): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    const indexExists = await this.client.indices.exists({
      index: this.indexName
    })
    if (!indexExists.body) {
      // No need to clean, no index exists.
      return
    }

    while (docs.length > 0) {
      const part = docs.splice(0, 10000)
      await this.client.deleteByQuery(
        {
          type: '_doc',
          index: this.indexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    terms: {
                      _id: part.map(this.getFulltextDocId),
                      boost: 1.0
                    }
                  },
                  {
                    match: {
                      workspaceId: { query: this.workspaceString, operator: 'and' }
                    }
                  }
                ]
              }
            },
            size: part.length
          }
        },
        undefined
      )
    }
  }
}

/**
 * @public
 */
export async function createElasticBackupDataAdapter (
  ctx: MeasureContext,
  hierarchy: Hierarchy,
  url: string,
  workspaceId: WorkspaceId
): Promise<DbAdapter> {
  const client = new Client({
    node: url
  })
  const indexBaseName = getIndexName()
  const indexVersion = getIndexVersion()
  return new ElasticDataAdapter(workspaceId, client, indexBaseName, indexVersion)
}
