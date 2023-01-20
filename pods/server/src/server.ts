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
  ServerStorage,
  WorkspaceId
} from '@hcengineering/core'
import { createElasticAdapter, createElasticBackupDataAdapter } from '@hcengineering/elastic'
import { ConfigurationMiddleware, ModifiedMiddleware, PrivateMiddleware } from '@hcengineering/middleware'
import { MinioService } from '@hcengineering/minio'
import { createMongoAdapter, createMongoTxAdapter } from '@hcengineering/mongo'
import { OpenAIEmbeddingsStage, openAIId, openAIPluginImpl } from '@hcengineering/openai'
import { addLocation, addStringsLoader } from '@hcengineering/platform'
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
  ContentRetrievalStage,
  ContentTextAdapter,
  createInMemoryAdapter,
  createPipeline,
  DbConfiguration,
  FullSummaryStage,
  FullTextAdapter,
  FullTextPipelineStage,
  FullTextPushStage,
  globalIndexer,
  IndexedFieldStage,
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

import { activityId } from '@hcengineering/activity'
import { attachmentId } from '@hcengineering/attachment'
import { automationId } from '@hcengineering/automation'
import { bitrixId } from '@hcengineering/bitrix'
import { boardId } from '@hcengineering/board'
import { calendarId } from '@hcengineering/calendar'
import { chunterId } from '@hcengineering/chunter'
import { contactId } from '@hcengineering/contact'
import { documentId } from '@hcengineering/document'
import { gmailId } from '@hcengineering/gmail'
import { hrId } from '@hcengineering/hr'
import { inventoryId } from '@hcengineering/inventory'
import { leadId } from '@hcengineering/lead'
import { loginId } from '@hcengineering/login'
import { notificationId } from '@hcengineering/notification'
import { preferenceId } from '@hcengineering/preference'
import { recruitId } from '@hcengineering/recruit'
import { requestId } from '@hcengineering/request'
import { settingId } from '@hcengineering/setting'
import { tagsId } from '@hcengineering/tags'
import { taskId } from '@hcengineering/task'
import { telegramId } from '@hcengineering/telegram'
import { templatesId } from '@hcengineering/templates'
import { trackerId } from '@hcengineering/tracker'
import { viewId } from '@hcengineering/view'
import { workbenchId } from '@hcengineering/workbench'

addStringsLoader(loginId, async (lang: string) => await import(`@hcengineering/login-assets/lang/${lang}.json`))
addStringsLoader(taskId, async (lang: string) => await import(`@hcengineering/task-assets/lang/${lang}.json`))
addStringsLoader(viewId, async (lang: string) => await import(`@hcengineering/view-assets/lang/${lang}.json`))
addStringsLoader(chunterId, async (lang: string) => await import(`@hcengineering/chunter-assets/lang/${lang}.json`))
addStringsLoader(
  attachmentId,
  async (lang: string) => await import(`@hcengineering/attachment-assets/lang/${lang}.json`)
)
addStringsLoader(contactId, async (lang: string) => await import(`@hcengineering/contact-assets/lang/${lang}.json`))
addStringsLoader(recruitId, async (lang: string) => await import(`@hcengineering/recruit-assets/lang/${lang}.json`))
addStringsLoader(activityId, async (lang: string) => await import(`@hcengineering/activity-assets/lang/${lang}.json`))
addStringsLoader(
  automationId,
  async (lang: string) => await import(`@hcengineering/automation-assets/lang/${lang}.json`)
)
addStringsLoader(settingId, async (lang: string) => await import(`@hcengineering/setting-assets/lang/${lang}.json`))
addStringsLoader(telegramId, async (lang: string) => await import(`@hcengineering/telegram-assets/lang/${lang}.json`))
addStringsLoader(leadId, async (lang: string) => await import(`@hcengineering/lead-assets/lang/${lang}.json`))
addStringsLoader(gmailId, async (lang: string) => await import(`@hcengineering/gmail-assets/lang/${lang}.json`))
addStringsLoader(workbenchId, async (lang: string) => await import(`@hcengineering/workbench-assets/lang/${lang}.json`))
addStringsLoader(inventoryId, async (lang: string) => await import(`@hcengineering/inventory-assets/lang/${lang}.json`))
addStringsLoader(templatesId, async (lang: string) => await import(`@hcengineering/templates-assets/lang/${lang}.json`))
addStringsLoader(
  notificationId,
  async (lang: string) => await import(`@hcengineering/notification-assets/lang/${lang}.json`)
)
addStringsLoader(tagsId, async (lang: string) => await import(`@hcengineering/tags-assets/lang/${lang}.json`))
addStringsLoader(calendarId, async (lang: string) => await import(`@hcengineering/calendar-assets/lang/${lang}.json`))
addStringsLoader(trackerId, async (lang: string) => await import(`@hcengineering/tracker-assets/lang/${lang}.json`))
addStringsLoader(boardId, async (lang: string) => await import(`@hcengineering/board-assets/lang/${lang}.json`))
addStringsLoader(
  preferenceId,
  async (lang: string) => await import(`@hcengineering/preference-assets/lang/${lang}.json`)
)
addStringsLoader(hrId, async (lang: string) => await import(`@hcengineering/hr-assets/lang/${lang}.json`))
addStringsLoader(documentId, async (lang: string) => await import(`@hcengineering/document-assets/lang/${lang}.json`))
addStringsLoader(bitrixId, async (lang: string) => await import(`@hcengineering/bitrix-assets/lang/${lang}.json`))
addStringsLoader(requestId, async (lang: string) => await import(`@hcengineering/request-assets/lang/${lang}.json`))

/**
 * @public
 */
export function start (
  dbUrl: string,
  fullTextUrl: string,
  minioConf: MinioConfig,
  rekoniUrl: string,
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
  addLocation(openAIId, () => Promise.resolve({ default: openAIPluginImpl }))

  const middlewares: MiddlewareCreator[] = [
    ModifiedMiddleware.create,
    PrivateMiddleware.create,
    ConfigurationMiddleware.create
  ]

  const fullText = getMetricsContext().newChild('fulltext', {})
  function createIndexStages (
    fullText: MeasureContext,
    workspace: WorkspaceId,
    adapter: FullTextAdapter,
    storage: ServerStorage,
    storageAdapter: MinioService,
    contentAdapter: ContentTextAdapter
  ): FullTextPipelineStage[] {
    // Allow 2 workspaces to be indexed in parallel
    globalIndexer.allowParallel = 2
    globalIndexer.processingSize = 1000

    const stages: FullTextPipelineStage[] = []

    // Add regular stage to for indexable fields change tracking.
    stages.push(new IndexedFieldStage(storage, fullText.newChild('fields', {})))

    // Obtain text content from storage(like minio) and use content adapter to convert files to text content.
    stages.push(new ContentRetrievalStage(storageAdapter, workspace, fullText.newChild('content', {}), contentAdapter))

    // // Add any => english language translation
    // const retranslateStage = new LibRetranslateStage(fullText.newChild('retranslate', {}), workspace)
    // retranslateStage.clearExcept = stages.map(it => it.stageId)
    // for (const st of stages) {
    //   // Clear retranslation on content change.
    //   st.updateFields.push((doc, upd) => retranslateStage.update(doc, upd))
    // }
    // stages.push(retranslateStage)

    // Summary stage
    const summaryStage = new FullSummaryStage()

    stages.push(summaryStage)

    // Push all content to elastic search
    const pushStage = new FullTextPushStage(adapter, workspace, fullText.newChild('push', {}))
    stages.push(pushStage)

    // OpenAI prepare stage
    const openAIStage = new OpenAIEmbeddingsStage(adapter, fullText.newChild('embeddings', {}), workspace)
    // We depend on all available stages.
    openAIStage.require = stages.map((it) => it.stageId)

    openAIStage.updateSummary(summaryStage)

    stages.push(openAIStage)

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
          stages: (adapter, storage, storageAdapter, contentAdapter) =>
            createIndexStages(fullText, workspace, adapter, storage, storageAdapter, contentAdapter)
        },
        contentAdapter: {
          factory: createRekoniAdapter,
          url: rekoniUrl,
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
