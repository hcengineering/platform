import contactPlugin from '@hcengineering/contact'
import { setOperationLogProfiling } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import { setDBExtraOptions } from '@hcengineering/postgres'
import { serverConfigFromEnv, type ServerEnv } from '@hcengineering/server'
import serverAiBot from '@hcengineering/server-ai-bot'
import serverCalendar from '@hcengineering/server-calendar'
import serverCore, { type PlatformQueue, type StorageConfiguration } from '@hcengineering/server-core'
import serverNotification from '@hcengineering/server-notification'
import { storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken from '@hcengineering/server-token'

export function getWorkspaceConfig (
  serviceName: string,
  ignoreDbUrls: boolean = false
): { config: ServerEnv, storageConfig: StorageConfiguration, queue: PlatformQueue } {
  const queueConfig = process.env.QUEUE_CONFIG
  if (queueConfig === undefined) {
    throw new Error('Please provide queue config')
  }

  const queue = getPlatformQueue(serviceName)

  void queue.createTopics(10).catch((err) => {
    console.error('Failed to create required topics', err)
  })

  setOperationLogProfiling(process.env.OPERATION_PROFILING === 'true')

  const config = serverConfigFromEnv(ignoreDbUrls)
  const storageConfig: StorageConfiguration = ignoreDbUrls ? { default: '', storages: [] } : storageConfigFromEnv()

  const usePrepare = (process.env.DB_PREPARE ?? 'true') === 'true'

  setDBExtraOptions({
    prepare: usePrepare // We override defaults
  })

  const lastNameFirst = process.env.LAST_NAME_FIRST === 'true'
  setMetadata(contactPlugin.metadata.LastNameFirst, lastNameFirst)
  setMetadata(serverCore.metadata.FrontUrl, config.frontUrl)
  setMetadata(serverCore.metadata.FilesUrl, config.filesUrl)
  setMetadata(serverToken.metadata.Secret, config.serverSecret)
  setMetadata(serverToken.metadata.Service, 'transactor')
  setMetadata(serverNotification.metadata.MailUrl, config.mailUrl ?? '')
  setMetadata(serverNotification.metadata.MailAuthToken, config.mailAuthToken)
  setMetadata(serverNotification.metadata.WebPushUrl, config.webPushUrl)
  setMetadata(serverAiBot.metadata.EndpointURL, process.env.AI_BOT_URL)
  setMetadata(serverCalendar.metadata.EndpointURL, process.env.CALENDAR_URL)
  return { config, storageConfig, queue }
}
