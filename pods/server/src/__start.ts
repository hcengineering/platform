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

// Add this to the VERY top of the first file loaded in your app
import contactPlugin from '@hcengineering/contact'
import notification from '@hcengineering/notification'
import { setMetadata } from '@hcengineering/platform'
import { serverConfigFromEnv } from '@hcengineering/server'
import { storageConfigFromEnv } from '@hcengineering/server-storage'
import serverCore, { type StorageConfiguration } from '@hcengineering/server-core'
import serverNotification from '@hcengineering/server-notification'
import serverToken from '@hcengineering/server-token'
import { start } from '.'
import { serverFactories } from '@hcengineering/server-ws/src/factories'
const serverFactory = serverFactories[(process.env.SERVER_PROVIDER as string) ?? 'ws'] ?? serverFactories.ws

const config = serverConfigFromEnv()

const storageConfig: StorageConfiguration = storageConfigFromEnv()

const cursorMaxTime = process.env.SERVER_CURSOR_MAXTIMEMS

const lastNameFirst = process.env.LAST_NAME_FIRST === 'true'
setMetadata(serverCore.metadata.CursorMaxTimeMS, cursorMaxTime)
setMetadata(serverCore.metadata.FrontUrl, config.frontUrl)
setMetadata(serverCore.metadata.UploadURL, config.uploadUrl)
setMetadata(serverToken.metadata.Secret, config.serverSecret)
setMetadata(serverNotification.metadata.SesUrl, config.sesUrl ?? '')
setMetadata(notification.metadata.PushPublicKey, config.pushPublicKey)
setMetadata(serverNotification.metadata.PushPrivateKey, config.pushPrivateKey)
setMetadata(serverNotification.metadata.PushSubject, config.pushSubject)
setMetadata(contactPlugin.metadata.LastNameFirst, lastNameFirst)
setMetadata(serverCore.metadata.ElasticIndexName, config.elasticIndexName)
setMetadata(serverCore.metadata.ElasticIndexVersion, 'v1')
setMetadata(serverCore.metadata.CollaboratorUrl, config.collaboratorUrl)

// eslint-disable-next-line @typescript-eslint/no-floating-promises
console.log(
  `starting server on ${config.serverPort} git_version: ${process.env.GIT_REVISION ?? ''} model_version: ${
    process.env.MODEL_VERSION ?? ''
  }`
)
const shutdown = start(config.url, {
  fullTextUrl: config.elasticUrl,
  storageConfig,
  rekoniUrl: config.rekoniUrl,
  port: config.serverPort,
  serverFactory,
  indexParallel: 2,
  indexProcessing: 50,
  productId: '',
  enableCompression: config.enableCompression,
  accountsUrl: config.accountsUrl
})

const close = (): void => {
  console.trace('Exiting from server')
  console.log('Shutdown request accepted')
  void shutdown().then(() => {
    process.exit(0)
  })
}

process.on('uncaughtException', (e) => {
  console.error(e)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('SIGINT', close)
process.on('SIGTERM', close)
