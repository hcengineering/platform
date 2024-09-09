/* eslint-disable @typescript-eslint/unbound-method */
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

import { type Branding, type BrandingMap, type WorkspaceIdWithUrl } from '@hcengineering/core'
import { BackupClientSession, buildStorageFromConfig, getMetricsContext } from '@hcengineering/server'

import { type Pipeline, type StorageConfiguration } from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'
import { ClientSession, start as startJsonRpc, type ServerFactory, type Session } from '@hcengineering/server-ws'

import { serverAiBotId } from '@hcengineering/server-ai-bot'
import { createAIBotAdapter } from '@hcengineering/server-ai-bot-resources'
import { createServerPipeline, registerServerPlugins, registerStringLoaders } from '@hcengineering/server-pipeline'

registerStringLoaders()

/**
 * @public
 */
export function start (
  dbUrls: string,
  opt: {
    fullTextUrl: string
    storageConfig: StorageConfiguration
    rekoniUrl: string
    port: number
    brandingMap: BrandingMap
    serverFactory: ServerFactory

    indexProcessing: number // 1000
    indexParallel: number // 2

    enableCompression?: boolean

    accountsUrl: string
  }
): () => Promise<void> {
  const metrics = getMetricsContext()

  registerServerPlugins()

  const [mainDbUrl, rawDbUrl] = dbUrls.split(';')

  const externalStorage = buildStorageFromConfig(opt.storageConfig, rawDbUrl ?? mainDbUrl)

  const pipelineFactory = createServerPipeline(
    metrics,
    dbUrls,
    { ...opt, externalStorage, adapterSecurity: rawDbUrl !== undefined },
    {
      serviceAdapters: {
        [serverAiBotId]: {
          factory: createAIBotAdapter,
          db: '%ai-bot',
          url: rawDbUrl ?? mainDbUrl
        }
      }
    }
  )
  const sessionFactory = (
    token: Token,
    pipeline: Pipeline,
    workspaceId: WorkspaceIdWithUrl,
    branding: Branding | null
  ): Session => {
    if (token.extra?.mode === 'backup') {
      return new BackupClientSession(token, pipeline, workspaceId, branding)
    }
    return new ClientSession(token, pipeline, workspaceId, branding)
  }

  const onClose = startJsonRpc(getMetricsContext(), {
    pipelineFactory,
    sessionFactory,
    port: opt.port,
    brandingMap: opt.brandingMap,
    serverFactory: opt.serverFactory,
    enableCompression: opt.enableCompression,
    accountsUrl: opt.accountsUrl,
    externalStorage
  })
  return async () => {
    await externalStorage.close()
    await onClose()
  }
}
