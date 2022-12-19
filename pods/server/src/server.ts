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

import {
  DOMAIN_BLOB,
  DOMAIN_FULLTEXT_BLOB,
  DOMAIN_MODEL,
  DOMAIN_TRANSIENT,
  DOMAIN_TX,
  MeasureContext,
  WorkspaceId
} from '@hcengineering/core'
import { createElasticAdapter, createElasticBackupDataAdapter } from '@hcengineering/elastic'
import { ModifiedMiddleware, PrivateMiddleware } from '@hcengineering/middleware'
import { MinioService } from '@hcengineering/minio'
import { createMongoAdapter, createMongoTxAdapter } from '@hcengineering/mongo'
import { OpenAIEmbeddingsStage } from '@hcengineering/openai'
import { addLocation } from '@hcengineering/platform'
import {
  BackupClientSession,
  createMinioDataAdapter,
  createNullAdapter,
  createRekoniAdapter,
  getMetricsContext,
  MinioConfig
} from '@hcengineering/server'
import { serverAttachmentId } from '@hcengineering/server-attachment'
import { serverCalendarId } from '@hcengineering/server-calendar'
import { serverChunterId } from '@hcengineering/server-chunter'
import { serverContactId } from '@hcengineering/server-contact'
import {
  createInMemoryAdapter,
  createPipeline,
  DbConfiguration,
  FullTextPipelineStageFactory,
  MiddlewareCreator,
  Pipeline
} from '@hcengineering/server-core'
import { serverGmailId } from '@hcengineering/server-gmail'
import { serverHrId } from '@hcengineering/server-hr'
import { serverInventoryId } from '@hcengineering/server-inventory'
import { serverLeadId } from '@hcengineering/server-lead'
import { serverNotificationId } from '@hcengineering/server-notification'
import { serverRecruitId } from '@hcengineering/server-recruit'
import { serverRequestId } from '@hcengineering/server-request'
import { serverSettingId } from '@hcengineering/server-setting'
import { serverTagsId } from '@hcengineering/server-tags'
import { serverTaskId } from '@hcengineering/server-task'
import { serverTelegramId } from '@hcengineering/server-telegram'
import { Token } from '@hcengineering/server-token'
import { serverTrackerId } from '@hcengineering/server-tracker'
import { BroadcastCall, ClientSession, start as startJsonRpc } from '@hcengineering/server-ws'
import { LibRetranslateStage } from '@hcengineering/translate'

/**
 * @public
 */
export function start (
  dbUrl: string,
  fullTextUrl: string,
  minioConf: MinioConfig,
  services: {
    rekoniUrl: string
    openAIToken?: string
    retranslateUrl?: string
    retranslateToken?: string
  },
  port: number,
  productId: string,
  host?: string
): () => Promise<void> {
  addLocation(serverAttachmentId, () => import('@hcengineering/server-attachment-resources'))
  addLocation(serverContactId, () => import('@hcengineering/server-contact-resources'))
  addLocation(serverNotificationId, () => import('@hcengineering/server-notification-resources'))
  addLocation(serverSettingId, () => import('@hcengineering/server-setting-resources'))
  addLocation(serverChunterId, () => import('@hcengineering/server-chunter-resources'))
  addLocation(serverInventoryId, () => import('@hcengineering/server-inventory-resources'))
  addLocation(serverLeadId, () => import('@hcengineering/server-lead-resources'))
  addLocation(serverRecruitId, () => import('@hcengineering/server-recruit-resources'))
  addLocation(serverTaskId, () => import('@hcengineering/server-task-resources'))
  addLocation(serverTrackerId, () => import('@hcengineering/server-tracker-resources'))
  addLocation(serverTagsId, () => import('@hcengineering/server-tags-resources'))
  addLocation(serverCalendarId, () => import('@hcengineering/server-calendar-resources'))
  addLocation(serverGmailId, () => import('@hcengineering/server-gmail-resources'))
  addLocation(serverTelegramId, () => import('@hcengineering/server-telegram-resources'))
  addLocation(serverRequestId, () => import('@hcengineering/server-request-resources'))
  addLocation(serverHrId, () => import('@hcengineering/server-hr-resources'))

  const middlewares: MiddlewareCreator[] = [ModifiedMiddleware.create, PrivateMiddleware.create]

  const fullText = getMetricsContext().newChild('fulltext', {})
  function createIndexStages (fullText: MeasureContext, workspace: WorkspaceId): FullTextPipelineStageFactory[] {
    const stages: FullTextPipelineStageFactory[] = []

    if (services.retranslateUrl !== undefined && services.retranslateUrl !== '') {
      // Add translation stage
      stages.push((adapter, stages) => {
        const stage = new LibRetranslateStage(
          fullText.newChild('retranslate', {}),
          services.retranslateUrl as string,
          services.retranslateToken ?? '',
          workspace
        )
        for (const st of stages) {
          // Clear retranslation on content change.
          st.updateFields.push((doc, upd, el) => stage.update(doc, upd, el))
        }
        return stage
      })
    }
    if (services.openAIToken !== undefined) {
      const token = services.openAIToken
      stages.push((adapter, stages) => {
        const stage = new OpenAIEmbeddingsStage(adapter, fullText.newChild('embeddings', {}), token, workspace)
        for (const st of stages) {
          // Clear embeddings in case of any changes.
          st.updateFields.push((doc, upd, el) => stage.update(doc, upd, el))
        }
        // We depend on all available stages.
        stage.require = stages.map((it) => it.stageId)

        // Do not clear anything
        stage.clearExcept = [...stages.map((it) => it.stageId), stage.stageId]
        return stage
      })
    }
    return stages
  }

  return startJsonRpc(
    getMetricsContext(),
    (workspace: WorkspaceId, upgrade: boolean) => {
      const conf: DbConfiguration = {
        domains: {
          [DOMAIN_TX]: 'MongoTx',
          [DOMAIN_TRANSIENT]: 'InMemory',
          [DOMAIN_BLOB]: 'MinioData',
          [DOMAIN_FULLTEXT_BLOB]: 'FullTextBlob',
          [DOMAIN_MODEL]: 'Null'
        },
        defaultAdapter: 'Mongo',
        adapters: {
          MongoTx: {
            factory: createMongoTxAdapter,
            url: dbUrl
          },
          Mongo: {
            factory: createMongoAdapter,
            url: dbUrl
          },
          Null: {
            factory: createNullAdapter,
            url: ''
          },
          InMemory: {
            factory: createInMemoryAdapter,
            url: ''
          },
          MinioData: {
            factory: createMinioDataAdapter,
            url: ''
          },
          FullTextBlob: {
            factory: createElasticBackupDataAdapter,
            url: fullTextUrl
          }
        },
        fulltextAdapter: {
          factory: createElasticAdapter,
          url: fullTextUrl,
          metrics: fullText,
          stages: createIndexStages(fullText, workspace)
        },
        contentAdapter: {
          factory: createRekoniAdapter,
          url: services.rekoniUrl,
          metrics: getMetricsContext().newChild('content', {})
        },
        storageFactory: () =>
          new MinioService({
            ...minioConf,
            port: 9000,
            useSSL: false
          }),
        workspace
      }
      return createPipeline(conf, middlewares, upgrade)
    },
    (token: Token, pipeline: Pipeline, broadcast: BroadcastCall) => {
      if (token.extra?.mode === 'backup') {
        return new BackupClientSession(broadcast, token, pipeline)
      }
      return new ClientSession(broadcast, token, pipeline)
    },
    port,
    productId,
    host
  )
}
