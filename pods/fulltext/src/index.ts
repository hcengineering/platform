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

import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics, type Tx } from '@hcengineering/core'
import {
  initStatisticsContext,
  type StorageConfiguration,
  type FullTextAdapterFactory
} from '@hcengineering/server-core'
import { join } from 'path'

import { createElasticAdapter } from '@hcengineering/elastic'
import { createOpenSearchAdapter } from '@hcengineering/opensearch'
import { createTypesenseAdapter } from '@hcengineering/typesense'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import { createRekoniAdapter, type FulltextDBConfiguration } from '@hcengineering/server-indexer'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken from '@hcengineering/server-token'
import { readFileSync } from 'fs'
import { startIndexer } from './server'

const model = JSON.parse(readFileSync(process.env.MODEL_JSON ?? 'model.json').toString()) as Tx[]

const serverSecret = process.env.SERVER_SECRET
if (serverSecret === undefined) {
  console.info('Please provide server secret')
  process.exit(1)
}

setMetadata(serverToken.metadata.Secret, serverSecret)
setMetadata(serverToken.metadata.Service, 'fulltext')

configureAnalytics('fulltext', process.env.VERSION ?? '0.7.0')
const metricsContext = initStatisticsContext('fulltext', {
  factory: () =>
    createOpenTelemetryMetricsContext(
      'fulltext',
      {},
      {},
      newMetrics(),
      new SplitLogger('fulltext', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

Analytics.setTag('application', 'fulltext')

const dbURL = process.env.DB_URL
if (dbURL === undefined) {
  console.error('DB_URL should be specified')
  process.exit(1)
}

const fullTextDbURL = process.env.FULLTEXT_DB_URL
if (fullTextDbURL === undefined) {
  console.error('FULLTEXT_DB_URL should be specified')
  process.exit(1)
}

const rekoniUrl = process.env.REKONI_URL
if (rekoniUrl === undefined) {
  console.error('REKONI_URL should be specified')
  process.exit(1)
}

const fulltextBackend = (process.env.FULLTEXT_BACKEND ?? 'elastic').toLowerCase()
const fulltextAdapterFactories: Record<string, FullTextAdapterFactory> = {
  elastic: createElasticAdapter,
  opensearch: createOpenSearchAdapter,
  typesense: createTypesenseAdapter
}
const fulltextFactory = fulltextAdapterFactories[fulltextBackend]
if (fulltextFactory === undefined) {
  console.error(`Unknown FULLTEXT_BACKEND: "${fulltextBackend}". Supported: elastic, opensearch, typesense`)
  process.exit(1)
}
console.info(`Using fulltext backend: ${fulltextBackend}`)

const config: FulltextDBConfiguration = {
  fulltextAdapter: {
    factory: fulltextFactory,
    url: fullTextDbURL
  },
  contentAdapters: {
    Rekoni: {
      factory: createRekoniAdapter,
      contentType: '*',
      url: rekoniUrl
    }
  },
  defaultContentAdapter: 'Rekoni'
}

const elasticIndexName = process.env.ELASTIC_INDEX_NAME ?? 'huly_storage_index'

const servicePort = parseInt(process.env.PORT ?? '4700')
metricsContext.info('Starting stats service')

const accountsUrl = process.env.ACCOUNTS_URL
if (accountsUrl === undefined) {
  console.error('please provide account url')
  process.exit(1)
}

const hulylakeUrl = process.env.HULYLAKE_URL ?? ''

const storageConfig: StorageConfiguration = storageConfigFromEnv()
const externalStorage = buildStorageFromConfig(storageConfig)

const queue = getPlatformQueue('fulltext')

const onClose = startIndexer(metricsContext, {
  queue,
  model,
  config,
  externalStorage,
  elasticIndexName,
  dbURL,
  hulylakeUrl,
  port: servicePort,
  serverSecret,
  accountsUrl
})

process.on('uncaughtException', (e) => {
  metricsContext.error('uncaughtException', { error: e })
})

process.on('unhandledRejection', (reason, promise) => {
  metricsContext.error('Unhandled Rejection at:', { reason, promise })
})

const close = (): void => {
  void onClose.then((res) => {
    res()
  })
}

process.on('SIGINT', close)
process.on('SIGTERM', close)
process.on('exit', close)
