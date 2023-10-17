//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { DOMAIN_TX, getWorkspaceId, MeasureMetricsContext } from '@hcengineering/core'
import { createInMemoryTxAdapter } from '@hcengineering/dev-storage'
import {
  ContentTextAdapter,
  createInMemoryAdapter,
  createPipeline,
  DbConfiguration,
  DummyFullTextAdapter,
  FullTextAdapter
} from '@hcengineering/server-core'
import { ClientSession, startHttpServer, start as startJsonRpc } from '@hcengineering/server-ws'

async function createNullFullTextAdapter (): Promise<FullTextAdapter> {
  return new DummyFullTextAdapter()
}
async function createNullContentTextAdapter (): Promise<ContentTextAdapter> {
  return {
    async content (name: string, type: string, doc) {
      return ''
    },
    metrics: () => new MeasureMetricsContext('', {})
  }
}

/**
 * @public
 */
export async function start (port: number, host?: string): Promise<void> {
  const ctx = new MeasureMetricsContext('server', {})
  startJsonRpc(ctx, {
    pipelineFactory: (ctx) => {
      const conf: DbConfiguration = {
        domains: {
          [DOMAIN_TX]: 'InMemoryTx'
        },
        defaultAdapter: 'InMemory',
        adapters: {
          InMemoryTx: {
            factory: createInMemoryTxAdapter,
            url: ''
          },
          InMemory: {
            factory: createInMemoryAdapter,
            url: ''
          }
        },
        fulltextAdapter: {
          factory: createNullFullTextAdapter,
          url: '',
          stages: () => []
        },
        metrics: new MeasureMetricsContext('', {}),
        contentAdapters: {
          default: {
            factory: createNullContentTextAdapter,
            contentType: '',
            url: ''
          }
        },
        defaultContentAdapter: 'default',
        workspace: getWorkspaceId('')
      }
      return createPipeline(ctx, conf, [], false, () => {})
    },
    sessionFactory: (token, pipeline, broadcast) => new ClientSession(broadcast, token, pipeline),
    port,
    productId: '',
    serverFactory: startHttpServer
  })
}
